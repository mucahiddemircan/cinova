import asyncio
from typing import List, Optional, Any
from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    ContentReadBasic,
    ContentDetailRead,
    HomeData,
    SearchGroupedRead,
    User,
    PaginatedContentRead,
)
from app.services import tmdb_client
from app.utils.image_utils import build_image_url
from app.utils.i18n_utils import (
    resolve_person_name,
    translate_department,
    translate_job,
    translate_language,
    translate_status,
    translate_role_name,
)
from app.utils.content_converters import (
    transform_content,
    merge_content_data,
)

class MovieService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_home_data(self, lang_config: dict) -> HomeData:
        """Ana sayfa verilerini paralel çeker."""
        from app.api.endpoints.people import list_popular_people
        
        all_content, popular_people_data = await asyncio.gather(
            tmdb_client.get_trending(media_type="all", lang_config=lang_config),
            list_popular_people(page=1, lang_config=lang_config),
        )

        lang = lang_config["lang"]
        movies = [transform_content(i, lang=lang) for i in all_content["results"] if i.get("media_type") == "movie"]
        series = [transform_content(i, lang=lang) for i in all_content["results"] if i.get("media_type") in ("tv", "series")]

        return {
            "movies": movies, 
            "series": series, 
            "people": popular_people_data["results"]
        }

    async def search_all(self, query_str: str, search_type: str, lang_config: dict) -> SearchGroupedRead | List[Any]:
        """TMDB ve yerel DB üzerinde hibrit arama yapar."""
        if not query_str:
            return SearchGroupedRead() if search_type == "all" else []

        lang = lang_config["lang"]
        
        if search_type == "movie":
            data = await tmdb_client.search_movies(query=query_str, lang_config=lang_config)
            return [transform_content(item, lang=lang) for item in data["results"]]

        if search_type == "series":
            data = await tmdb_client.search_series(query=query_str, lang_config=lang_config)
            return [transform_content(item, lang=lang) for item in data["results"]]

        if search_type == "person":
            data = await tmdb_client.search_person(query=query_str, lang_config=lang_config)
            return [self._transform_person_to_card(item, lang=lang) for item in data["results"]]

        if search_type == "profile":
            return await self._search_local_profiles(query_str)

        # "all" type logic
        tmdb_data, profiles = await asyncio.gather(
            tmdb_client.search_content(query=query_str, lang_config=lang_config),
            self._search_local_profiles(query_str),
        )

        grouped = SearchGroupedRead(profiles=profiles)
        tmdb_transformed = []
        for item in tmdb_data["results"]:
            media_type = item.get("media_type")
            transformed = None
            if media_type == "movie":
                transformed = transform_content(item, lang=lang)
                grouped.movies.append(transformed)
            elif media_type in ("tv", "series"):
                transformed = transform_content(item, lang=lang)
                grouped.series.append(transformed)
            elif media_type == "person":
                transformed = self._transform_person_to_card(item, lang=lang)
                grouped.people.append(transformed)
            
            if transformed:
                tmdb_transformed.append(transformed)

        grouped.relevant = self._build_relevant_list(tmdb_transformed, profiles, query_str)
        return grouped

    async def get_details(self, item_id: int, lang_config: dict) -> ContentDetailRead:
        """Film detaylarını çeker ve birleştirir."""
        try:
            tr_data, en_data = await tmdb_client.get_details("movie", item_id, lang_config=lang_config)
            tr_data["media_type"] = "movie"
            if en_data:
                en_data["media_type"] = "movie"
        except HTTPException:
            raise HTTPException(status_code=404, detail="Film bulunamadı")

        merged = merge_content_data(tr_data, en_data)
        lang = lang_config["lang"]
        base = transform_content(merged, backdrop_size="original", lang=lang)
        
        credits_data = merged.get("credits", {})
        base["cast"] = [self._build_cast_entry(c, lang=lang) for c in credits_data.get("cast", [])[:15]]
        
        crew_list = []
        for c in credits_data.get("crew", []):
            jobs = c.get("jobs", [])
            is_director = c.get("job") == "Director" or any(j.get("job") == "Director" for j in jobs)
            if not is_director:
                continue
            entry = self._build_crew_entry(c, lang=lang)
            entry["known_for_department"] = translate_department("Directing", lang=lang)
            crew_list.append(entry)
        base["crew"] = crew_list

        base["runtime"] = merged.get("runtime")
        base["production_companies"] = [comp.get("name") for comp in merged.get("production_companies", [])]
        base["status"] = translate_status(merged.get("status"), lang=lang)
        base["original_language"] = translate_language(merged.get("original_language"), lang=lang)

        providers_data = await tmdb_client.get_watch_providers("movie", item_id)
        base["watch_providers"] = self._build_watch_providers(providers_data)
        base["genres"] = [g.get("name") for g in merged.get("genres", [])]

        return base

    # --- Internal Helpers (Extracted from endpoints) ---

    def _transform_person_to_card(self, item: dict, lang: str = "tr") -> dict:
        display_name, shown_original = resolve_person_name(item, lang=lang)
        dept = item.get("known_for_department")
        nav_type = "director" if dept == "Directing" else "actor"
        img_path = build_image_url(item.get("profile_path"))

        return {
            "id": item.get("id"),
            "title": display_name,
            "name": display_name,
            "original_title": shown_original,
            "original_name": shown_original,
            "description": f"{'Popularity' if lang == 'en' else 'Popülerlik'}: {item.get('popularity')}",
            "type": "person",
            "nav_type": nav_type,
            "release_date": None,
            "role": translate_department(dept, lang=lang),
            "poster_path": img_path,
            "profile_path": img_path,
            "backdrop_path": None,
            "vote_average": None,
            "popularity": item.get("popularity"),
        }

    async def _search_local_profiles(self, query_str: str) -> List[dict]:
        query = select(User).where(User.username.ilike(f"%{query_str}%"))
        result = await self.session.exec(query)
        return [
            {
                "id": u.id,
                "title": u.username,
                "name": u.username,
                "original_title": None,
                "original_name": None,
                "description": None,
                "type": "profile",
                "nav_type": "profile",
                "release_date": None,
                "role": "Profil",
                "poster_path": u.avatar_url,
                "profile_path": u.avatar_url,
                "backdrop_path": None,
                "vote_average": None,
                "popularity": 0,
            }
            for u in result.all()
        ]

    def _build_relevant_list(self, tmdb_items: list, profiles: list, query: str, limit: int = 8) -> list:
        relevant = list(tmdb_items[:5])
        exact_profiles = [p for p in profiles if p["title"].strip().lower() == query.strip().lower()]
        for p in exact_profiles:
            if p not in relevant and len(relevant) < limit:
                relevant.append(p)

        remaining_tmdb = [t for t in tmdb_items if t not in relevant]
        slots = limit - len(relevant)
        if slots > 0:
            relevant.extend(remaining_tmdb[:slots])

        if len(relevant) < limit:
            remaining_profiles = [p for p in profiles if p not in relevant]
            slots = limit - len(relevant)
            relevant.extend(remaining_profiles[:slots])
        return relevant

    def _build_cast_entry(self, person: dict, lang: str = "tr") -> dict:
        display_name, shown_original = resolve_person_name(person, lang=lang)
        char_str = person.get("character")
        role_name = ""
        if char_str:
            parts = [p.strip() for p in char_str.split("/") if p.strip()]
            translated = [translate_role_name(p, lang=lang) for p in parts]
            role_name = " / ".join(translated)

        return {
            "id": person.get("id"),
            "name": display_name,
            "original_name": shown_original,
            "profile_path": build_image_url(person.get("profile_path")),
            "known_for_department": role_name,
        }

    def _build_crew_entry(self, person: dict, lang: str = "tr") -> dict:
        display_name, shown_original = resolve_person_name(person, lang=lang)
        job_list = [translate_job(j.get("job"), lang=lang) for j in person.get("jobs", []) if j.get("job")]
        jobs = job_list if job_list else [translate_job(person.get("job"), lang=lang)]

        return {
            "id": person.get("id"),
            "name": display_name,
            "original_name": shown_original,
            "profile_path": build_image_url(person.get("profile_path")),
            "known_for_department": ", ".join(jobs),
            "department": person.get("department"),
        }

    def _build_watch_providers(self, providers_data: dict) -> dict:
        result = {}
        provider_categories = ("flatrate", "ads", "free", "rent", "buy")

        for country, data in providers_data.items():
            region = {"link": data.get("link")}
            for category in provider_categories:
                region[category] = [
                    {
                        "provider_id": p.get("provider_id"),
                        "provider_name": p.get("provider_name"),
                        "logo_path": build_image_url(p.get("logo_path")),
                        "display_priority": p.get("display_priority"),
                    }
                    for p in data.get(category, [])
                ]
            result[country] = region
        return result
