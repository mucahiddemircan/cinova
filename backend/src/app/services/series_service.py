import asyncio
from typing import List, Optional
from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    ContentReadBasic,
    ContentDetailRead,
    CastRead,
    PaginatedContentRead,
    SeasonDetailRead
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
    transform_season,
    merge_content_data,
    merge_season_data,
)

class SeriesService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_details(self, item_id: int, lang_config: dict) -> ContentDetailRead:
        """Fetches and merges series details."""
        try:
            tr_data, en_data = await tmdb_client.get_details("series", item_id, lang_config=lang_config)
            tr_data["media_type"] = "series"
            if en_data:
                en_data["media_type"] = "series"
        except HTTPException:
            raise HTTPException(status_code=404, detail="Dizi bulunamadı")

        merged = merge_content_data(tr_data, en_data)
        lang = lang_config["lang"]
        base = transform_content(merged, backdrop_size="original", lang=lang)
        
        credits_data = self._get_credits_data(merged)
        base["cast"] = [self._build_cast_entry(c, lang=lang) for c in credits_data.get("cast", [])[:15]]
        
        crew_list = []
        for c in merged.get("created_by", []):
            crew_list.append({
                "id": c.get("id"),
                "name": c.get("name"),
                "original_name": None,
                "profile_path": build_image_url(c.get("profile_path")),
                "known_for_department": "Creator" if lang[:2] == "en" else "Yaratıcı",
            })

        for c in credits_data.get("crew", []):
            jobs = c.get("jobs", [])
            is_director = c.get("job") == "Director" or any(j.get("job") == "Director" for j in jobs)
            if not is_director:
                continue
            entry = self._build_crew_entry(c, lang=lang)
            entry["known_for_department"] = translate_department("Directing", lang=lang)
            crew_list.append(entry)
        base["crew"] = crew_list

        episode_runtimes = merged.get("episode_run_time") or []
        base["runtime"] = merged.get("runtime") or (episode_runtimes[0] if episode_runtimes else None)

        base["production_companies"] = [comp.get("name") for comp in merged.get("production_companies", [])]
        base["status"] = translate_status(merged.get("status"), lang=lang)
        base["original_language"] = translate_language(merged.get("original_language"), lang=lang)
        base["number_of_seasons"] = merged.get("number_of_seasons")
        
        base["seasons"] = [
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "season_number": s.get("season_number"),
                "episode_count": s.get("episode_count"),
                "air_date": s.get("air_date"),
                "poster_path": build_image_url(s.get("poster_path")),
                "overview": s.get("overview"),
            }
            for s in merged.get("seasons", [])
        ]

        providers_data = await tmdb_client.get_watch_providers("series", item_id)
        base["watch_providers"] = self._build_watch_providers(providers_data)
        base["genres"] = [g.get("name") for g in merged.get("genres", [])]

        return base

    async def get_season(self, item_id: int, season_number: int, lang_config: dict) -> SeasonDetailRead:
        """Fetches season details."""
        try:
            tr_data, en_data = await tmdb_client.get_season_details(item_id, season_number, lang_config=lang_config)
        except HTTPException:
            raise HTTPException(status_code=404, detail="Sezon bulunamadı")

        merged = merge_season_data(tr_data, en_data)
        return transform_season(merged, lang=lang_config["lang"])

    def _get_credits_data(self, merged: dict) -> dict:
        if "aggregate_credits" in merged:
            return merged["aggregate_credits"]
        return merged.get("credits", {})

    def _build_cast_entry(self, person: dict, lang: str = "tr") -> dict:
        display_name, shown_original = resolve_person_name(person, lang=lang)
        role_counts = {}
        raw_roles_data = person.get("roles", [])
        
        if raw_roles_data:
            for r in raw_roles_data:
                char_str = r.get("character")
                if char_str:
                    parts = [p.strip() for p in char_str.split("/") if p.strip()]
                    eps = r.get("episode_count", 1)
                    for part in parts:
                        translated = translate_role_name(part, lang=lang)
                        role_counts[translated] = role_counts.get(translated, 0) + eps
        else:
            char_str = person.get("character")
            if char_str:
                parts = [p.strip() for p in char_str.split("/") if p.strip()]
                for part in parts:
                    translated = translate_role_name(part, lang=lang)
                    role_counts[translated] = role_counts.get(translated, 1)

        sorted_roles = sorted(role_counts.keys(), key=lambda x: role_counts[x], reverse=True)
        role_name = " / ".join(sorted_roles)

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
