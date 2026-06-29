"""TMDB API client. All external API calls are made through this module.

Dil Stratejisi:
- Liste endpoint'leri: Tek dilde sıralama + İkincil dilde veri zenginleştirme (enrichment)
- Detay endpoint'leri: Paralel çift çağrı (tr-TR + en-US) → merge (Full fallback için)
"""

import asyncio
import time
import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.utils.content_converters import merge_person_data

_client: httpx.AsyncClient | None = None

# Cache: {cache_key: {"data": value, "expiry": timestamp}}
_cache = {}
CACHE_TTL = 300  # 5 minutes

HEADERS = {"accept": "application/json"}

# Language settings
PRIMARY_LANGUAGE = "tr-TR"
FALLBACK_LANGUAGE = "en-US"

# Parameter that ensures multiple languages are returned in images
IMAGE_LANGUAGE_PARAM = "tr,en,null"

# Application-wide minimum vote limit
MIN_VOTE_COUNT = 10


def get_client() -> httpx.AsyncClient:
    """Returns a single AsyncClient instance."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


def get_language_config(accept_language: str | None) -> dict:
    """Returns the TMDB language configuration from the Accept-Language header.
    
    Varsayılan olarak Türkçe (tr-TR) döndürür. Eğer header 'en' içeriyorsa
    İngilizce'yi (en-US) birincil dil yapar.
    """
    primary = PRIMARY_LANGUAGE
    fallback = FALLBACK_LANGUAGE

    if accept_language:
        # Example header: "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
        # We only check main language codes (tr, en)
        langs = [l.strip().split(";")[0].split("-")[0].lower() for l in accept_language.split(",")]
        
        # If one of the top choices is English, make it primary
        if langs and langs[0] == "en":
            primary = FALLBACK_LANGUAGE
            fallback = PRIMARY_LANGUAGE
        elif "en" in langs and "tr" not in langs:
            primary = FALLBACK_LANGUAGE
            fallback = PRIMARY_LANGUAGE

    # If primary is already English, no fallback language is needed (English is most comprehensive)
    if primary == FALLBACK_LANGUAGE:
        fallback = None

    lang = primary.split("-")[0] or "tr"
    return {"primary": primary, "fallback": fallback, "lang": lang}


async def fetch(endpoint: str, params: dict | None = None) -> dict:
    """Sends a request to TMDB API and returns JSON response."""
    request_params = {"api_key": settings.TMDB_API_KEY, "language": PRIMARY_LANGUAGE, "include_adult": False, "include_video": False}
    if params:
        request_params.update(params)

    url = f"{settings.TMDB_BASE_URL}/{endpoint.lstrip('/')}"
    client = get_client()

    try:
        response = await client.get(url, params=request_params, headers=HEADERS)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"TMDB bağlantı hatası: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="TMDB API hatası")

    return response.json()


async def fetch_bilingual(
    endpoint: str, params: dict | None = None, lang_config: dict | None = None, secondary_params: dict | None = None
) -> tuple[dict, dict | None]:
    """Fetches content in primary and secondary languages in parallel."""
    lang_config = lang_config or get_language_config(None)
    primary_lang = lang_config["primary"]
    fallback_lang = lang_config["fallback"]
    
    base_params = params or {}
    sec_params = secondary_params if secondary_params is not None else base_params
    
    # Primary task always runs
    primary_task = fetch(endpoint, {**base_params, "language": primary_lang})
    
    if fallback_lang:
        fallback_task = fetch(endpoint, {**sec_params, "language": fallback_lang})
        primary_data, fallback_data = await asyncio.gather(primary_task, fallback_task)
        return primary_data, fallback_data
    
    # If no fallback language, only return the first one
    primary_data = await primary_task
    return primary_data, None


async def fetch_list_bilingual(
    endpoint: str, params: dict | None = None, is_person: bool = False, lang_config: dict | None = None
) -> dict:
    """Fetches a list endpoint and returns results.
    
    Data Fallback (Enrichment): Birincil dildeki içerikleri (TR) ikincil dildeki (EN) verilerle zenginleştirir.
    NOT: Liste birleştirme (merge) kaldırıldı, sadece veri zenginleştirme yapılır.
    """
    lang_config = lang_config or get_language_config(None)
    primary_lang = lang_config["primary"]
    fallback_lang = lang_config["fallback"]
    lang = lang_config["lang"]
    
    cache_key = f"list:{endpoint}:{str(params)}:{is_person}:{lang}"
    now = time.time()
    
    if cache_key in _cache and _cache[cache_key]["expiry"] > now:
        return _cache[cache_key]["data"]

    # Parallel requests (if fallback language exists)
    base_params = params or {}
    primary_task = fetch(endpoint, {**base_params, "language": primary_lang})
    
    if fallback_lang:
        fallback_task = fetch(endpoint, {**base_params, "language": fallback_lang})
        primary_data, fallback_data = await asyncio.gather(primary_task, fallback_task)
    else:
        primary_data = await primary_task
        fallback_data = None

    primary_results = primary_data.get("results", [])
    
    # Only enrich, do not add new items!
    if fallback_data:
        secondary_results = fallback_data.get("results", [])
        sec_map = {item.get("id"): item for item in secondary_results if item.get("id")}
        
        for item in primary_results:
            item_id = item.get("id")
            s_item = sec_map.get(item_id)
            if s_item:
                if is_person:
                    item["_fallback_name"] = s_item.get("name")
                else:
                    item["_fallback_title"] = s_item.get("title") or s_item.get("name")
                    item["_fallback_overview"] = s_item.get("overview")
                    item["_fallback_tagline"] = s_item.get("tagline")
                    
                    # Image Fallback
                    for field in ("poster_path", "backdrop_path"):
                        item[f"_fallback_{field}"] = s_item.get(field)

    result = {
        "results": primary_results,
        "page": primary_data.get("page", 1),
        "total_pages": primary_data.get("total_pages", 1),
        "total_results": primary_data.get("total_results", 0),
    }
    
    _cache[cache_key] = {"data": result, "expiry": now + CACHE_TTL}
    return result


# ──────────────────────────────────────────────────────────
# List Endpoints — Dual language fallback
# ──────────────────────────────────────────────────────────


async def get_trending(media_type: str = "movie", page: int = 1, lang_config: dict | None = None) -> dict:
    """Fetches daily trending content (changes daily)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    return await fetch_list_bilingual(
        f"trending/{tmdb_type}/day",
        params={"include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def get_popular(media_type: str = "movie", page: int = 1, lang_config: dict | None = None) -> dict:
    """Fetches popular content (Official TMDB list)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    return await fetch_list_bilingual(
        f"{tmdb_type}/popular",
        params={"page": page, "include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


async def search_content(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """Performs TMDB multi-search (movie, series, person)."""
    return await fetch_list_bilingual(
        "search/multi",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def search_movies(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """Performs TMDB movie search."""
    return await fetch_list_bilingual(
        "search/movie",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def search_series(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """Performs TMDB series search."""
    return await fetch_list_bilingual(
        "search/tv",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def search_person(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """Performs TMDB person search."""
    return await fetch_list_bilingual(
        "search/person",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        is_person=True,
        lang_config=lang_config,
    )


async def get_recommendations(media_type: str, item_id: int, lang_config: dict | None = None) -> dict:
    """Performs TMDB recommendations search."""
    tmdb_type = "tv" if media_type == "series" else media_type
    return await fetch_list_bilingual(
        f"{tmdb_type}/{item_id}/recommendations",
        params={"include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


async def get_popular_people(page: int = 1, lang_config: dict | None = None) -> dict:
    """Performs TMDB popular people search."""
    return await fetch_list_bilingual(
        "person/popular", params={"page": page}, is_person=True, lang_config=lang_config
    )


async def get_category_list(media_type: str, category: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """Fetches content in a specific category (popular, top_rated, upcoming, now_playing, on_the_air)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    
    # Redirect popular and top rated to discover for vote count filter support
    if category == "popular":
        return await get_popular(media_type, page, lang_config)
    
    if category == "top_rated":
        return await fetch_list_bilingual(
            f"{tmdb_type}/top_rated",
            params={"page": page, "include_image_language": IMAGE_LANGUAGE_PARAM},
            lang_config=lang_config,
        )

    return await fetch_list_bilingual(
        f"{tmdb_type}/{category}",
        params={"page": page, "include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


async def discover_content(media_type: str, params: dict, lang_config: dict | None = None) -> dict:
    """Finds content using the TMDB discover endpoint."""
    tmdb_type = "tv" if media_type == "series" else media_type
    
    # Add default minimum vote limit (if not specified)
    if "vote_count.gte" not in params:
        params["vote_count.gte"] = MIN_VOTE_COUNT
        
    return await fetch_list_bilingual(
        f"discover/{tmdb_type}",
        params={**params, "include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


# ──────────────────────────────────────────────────────────
# Detail Endpoints — Dual language, full fallback
# ──────────────────────────────────────────────────────────


async def get_details(media_type: str, item_id: int, lang_config: dict | None = None) -> tuple[dict, dict]:
    """Fetches content details in TR and EN in parallel.

    Returns:
        (tr_data, en_data) — Merging is done on the caller side.
    """
    append = "credits,videos"
    tmdb_type = "tv" if media_type == "series" else media_type
    
    if media_type in ("series", "tv"):
        append += ",aggregate_credits,content_ratings"
    else:
        append += ",release_dates"

    return await fetch_bilingual(
        f"{tmdb_type}/{item_id}",
        params={"append_to_response": append},
        lang_config=lang_config,
    )


async def get_person_brief(person_id: int, lang_config: dict | None = None) -> dict:
    """Fetches person information in dual languages and merges it.

    NOTE: For details pages, get_person_details() should be used.
    """
    tr_data, en_data = await fetch_bilingual(
        f"person/{person_id}",
        params={"append_to_response": "combined_credits"},
        lang_config=lang_config,
    )
    return merge_person_data(tr_data, en_data)


async def get_person_details(person_id: int, lang_config: dict | None = None) -> tuple[dict, dict]:
    """Fetches person details in TR and EN in parallel (for details page).

    Returns:
        (tr_data, en_data) — Merging is done on the caller side.
    """
    return await fetch_bilingual(
        f"person/{person_id}",
        params={"append_to_response": "combined_credits"},
        lang_config=lang_config,
    )


async def get_all_certifications() -> dict:
    """Fetches all movie and series certifications from TMDB."""
    movie_task = fetch("certification/movie/list")
    series_task = fetch("certification/tv/list")
    
    movie_certs, series_certs = await asyncio.gather(movie_task, series_task)
    return {
        "movie": movie_certs.get("certifications", {}),
        "series": series_certs.get("certifications", {})
    }


async def get_watch_providers(media_type: str, item_id: int) -> dict:
    """Fetches watch providers where content is available (JustWatch data)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    data = await fetch(f"{tmdb_type}/{item_id}/watch/providers")
    return data.get("results", {})


async def get_all_watch_providers(media_type: str = "movie", region: str = "TR", lang: str = "tr-TR") -> list[dict]:
    """Fetches all watch providers in a specific region."""
    tmdb_type = "tv" if media_type == "series" else media_type
    data = await fetch(f"watch/providers/{tmdb_type}", params={"watch_region": region, "language": lang})
    return data.get("results", [])


# ──────────────────────────────────────────────────────────
# Configuration Endpoints
# ──────────────────────────────────────────────────────────


async def get_genres(media_type: str = "movie", lang: str = "tr-TR") -> list[dict]:
    """Fetches the list of all genres."""
    tmdb_type = "tv" if media_type == "series" else media_type
    data = await fetch(f"genre/{tmdb_type}/list", params={"language": lang})
    return data.get("genres", [])


async def get_countries(lang: str = "tr-TR") -> list[dict]:
    """Fetches the list of all countries."""
    return await fetch("configuration/countries", params={"language": lang})


async def get_languages() -> list[dict]:
    """Fetches the list of all languages."""
    return await fetch("configuration/languages")


# ──────────────────────────────────────────────────────────
# Hydration Helpers
# ──────────────────────────────────────────────────────────


async def get_batch_details(items: list[tuple[str, int]], lang_config: dict | None = None) -> list[dict]:
    """Fetches basic details of multiple contents (movie/series) in parallel."""
    if not items:
        return []
        
    lang = lang_config["primary"] if lang_config else PRIMARY_LANGUAGE
    
    tasks = []
    for m_type, tmdb_id in items:
        tmdb_type = "tv" if m_type == "series" else m_type
        tasks.append(fetch(f"{tmdb_type}/{tmdb_id}", params={"language": lang}))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r if not isinstance(r, Exception) else {} for r in results]


async def get_batch_people(person_ids: list[int], lang_config: dict | None = None) -> list[dict]:
    """Fetches basic details of multiple people in parallel."""
    if not person_ids:
        return []
        
    lang = lang_config["primary"] if lang_config else PRIMARY_LANGUAGE
    
    tasks = []
    for pid in person_ids:
        tasks.append(fetch(f"person/{pid}", params={"language": lang}))
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r if not isinstance(r, Exception) else {} for r in results]


async def get_season_details(series_id: int, season_number: int, lang_config: dict | None = None) -> tuple[dict, dict]:
    """Fetches details of a specific season of a series in TR and EN in parallel.

    Returns:
        (tr_data, en_data) — Merging is done on the caller side.
    """
    return await fetch_bilingual(
        f"tv/{series_id}/season/{season_number}",
        params={"append_to_response": "credits,videos"},
        lang_config=lang_config,
    )
