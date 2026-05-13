"""TMDB API istemcisi. Tüm dış API çağrıları bu modül üzerinden yapılır.

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

# Önbellek: {cache_key: {"data": value, "expiry": timestamp}}
_cache = {}
CACHE_TTL = 300  # 5 dakika

HEADERS = {"accept": "application/json"}

# Dil ayarları
PRIMARY_LANGUAGE = "tr-TR"
FALLBACK_LANGUAGE = "en-US"

# Görsellerde birden fazla dilin döndürülmesini sağlayan parametre
IMAGE_LANGUAGE_PARAM = "tr,en,null"

# Uygulama genelinde minimum oy sınırı
MIN_VOTE_COUNT = 10


def get_client() -> httpx.AsyncClient:
    """Tek bir AsyncClient örneği döndürür."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


def get_language_config(accept_language: str | None) -> dict:
    """Accept-Language header'ından TMDB dil konfigürasyonunu döndürür.
    
    Varsayılan olarak Türkçe (tr-TR) döndürür. Eğer header 'en' içeriyorsa
    İngilizce'yi (en-US) birincil dil yapar.
    """
    primary = PRIMARY_LANGUAGE
    fallback = FALLBACK_LANGUAGE

    if accept_language:
        # Header örneği: "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
        # Sadece ana dil kodlarına bakıyoruz (tr, en)
        langs = [l.strip().split(";")[0].split("-")[0].lower() for l in accept_language.split(",")]
        
        # Eğer ilk tercihlerden biri İngilizce ise birincil yap
        if langs and langs[0] == "en":
            primary = FALLBACK_LANGUAGE
            fallback = PRIMARY_LANGUAGE
        elif "en" in langs and "tr" not in langs:
            primary = FALLBACK_LANGUAGE
            fallback = PRIMARY_LANGUAGE

    # Eğer birincil zaten İngilizce ise, yedek dile gerek yok (İngilizce en kapsamlıdır)
    if primary == FALLBACK_LANGUAGE:
        fallback = None

    lang = primary.split("-")[0] or "tr"
    return {"primary": primary, "fallback": fallback, "lang": lang}


async def fetch(endpoint: str, params: dict | None = None) -> dict:
    """TMDB API'ye istek atar ve JSON yanıtı döndürür."""
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
    """İçeriği birincil ve ikincil dillerde paralel olarak çeker."""
    lang_config = lang_config or get_language_config(None)
    primary_lang = lang_config["primary"]
    fallback_lang = lang_config["fallback"]
    
    base_params = params or {}
    sec_params = secondary_params if secondary_params is not None else base_params
    
    # Birincil görev her zaman çalışır
    primary_task = fetch(endpoint, {**base_params, "language": primary_lang})
    
    if fallback_lang:
        fallback_task = fetch(endpoint, {**sec_params, "language": fallback_lang})
        primary_data, fallback_data = await asyncio.gather(primary_task, fallback_task)
        return primary_data, fallback_data
    
    # Yedek dil yoksa sadece birinciyi dön
    primary_data = await primary_task
    return primary_data, None


async def fetch_list_bilingual(
    endpoint: str, params: dict | None = None, is_person: bool = False, lang_config: dict | None = None
) -> dict:
    """Bir liste endpoint'ini çeker ve sonuçları döndürür.
    
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

    # Paralel istekler (Eğer yedek dil varsa)
    base_params = params or {}
    primary_task = fetch(endpoint, {**base_params, "language": primary_lang})
    
    if fallback_lang:
        fallback_task = fetch(endpoint, {**base_params, "language": fallback_lang})
        primary_data, fallback_data = await asyncio.gather(primary_task, fallback_task)
    else:
        primary_data = await primary_task
        fallback_data = None

    primary_results = primary_data.get("results", [])
    
    # Sadece zenginleştir (enrich), yeni öğe ekleme!
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
                    
                    # Görsel Fallback
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
# Liste Endpoint'leri — Çift dil fallback
# ──────────────────────────────────────────────────────────


async def get_trending(media_type: str = "movie", page: int = 1, lang_config: dict | None = None) -> dict:
    """Günün trend içeriklerini getirir (günlük değişen)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    return await fetch_list_bilingual(
        f"trending/{tmdb_type}/day",
        params={"include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def get_popular(media_type: str = "movie", page: int = 1, lang_config: dict | None = None) -> dict:
    """Genel popüler içerikleri getirir (Resmi TMDB listesi)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    return await fetch_list_bilingual(
        f"{tmdb_type}/popular",
        params={"page": page, "include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


async def search_content(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """TMDB çoklu arama yapar (film, dizi, kişi)."""
    return await fetch_list_bilingual(
        "search/multi",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def search_movies(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """TMDB film araması yapar."""
    return await fetch_list_bilingual(
        "search/movie",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def search_series(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """TMDB dizi araması yapar."""
    return await fetch_list_bilingual(
        "search/tv",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        lang_config=lang_config,
    )


async def search_person(query: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """TMDB kişi araması yapar."""
    return await fetch_list_bilingual(
        "search/person",
        params={"query": query, "include_image_language": IMAGE_LANGUAGE_PARAM, "page": page},
        is_person=True,
        lang_config=lang_config,
    )


async def get_recommendations(media_type: str, item_id: int, lang_config: dict | None = None) -> dict:
    """Benzer içerik önerilerini getirir."""
    tmdb_type = "tv" if media_type == "series" else media_type
    return await fetch_list_bilingual(
        f"{tmdb_type}/{item_id}/recommendations",
        params={"include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


async def get_popular_people(page: int = 1, lang_config: dict | None = None) -> dict:
    """Popüler kişileri getirir."""
    return await fetch_list_bilingual(
        "person/popular", params={"page": page}, is_person=True, lang_config=lang_config
    )


async def get_category_list(media_type: str, category: str, page: int = 1, lang_config: dict | None = None) -> dict:
    """Belirli bir kategorideki içerikleri getirir (popular, top_rated, upcoming, now_playing, on_the_air)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    
    # Vote count filter desteği için popüler ve en iyileri discover'a yönlendiriyoruz
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
    """TMDB keşfet (discover) endpoint'ini kullanarak içerik bulur."""
    tmdb_type = "tv" if media_type == "series" else media_type
    
    # Varsayılan minimum oy sınırı ekle (eğer belirtilmemişse)
    if "vote_count.gte" not in params:
        params["vote_count.gte"] = MIN_VOTE_COUNT
        
    return await fetch_list_bilingual(
        f"discover/{tmdb_type}",
        params={**params, "include_image_language": IMAGE_LANGUAGE_PARAM},
        lang_config=lang_config,
    )


# ──────────────────────────────────────────────────────────
# Detay Endpoint'leri — Çift dil, tam fallback
# ──────────────────────────────────────────────────────────


async def get_details(media_type: str, item_id: int, lang_config: dict | None = None) -> tuple[dict, dict]:
    """İçerik detayını TR ve EN olarak paralel çeker.

    Returns:
        (tr_data, en_data) — Birleştirme (merge) işlemi çağıran tarafta yapılır.
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
    """Kişi bilgisini çift dilde çeker ve birleştirir.

    NOT: Detay sayfaları için get_person_details() kullanılmalıdır.
    """
    tr_data, en_data = await fetch_bilingual(
        f"person/{person_id}",
        params={"append_to_response": "combined_credits"},
        lang_config=lang_config,
    )
    return merge_person_data(tr_data, en_data)


async def get_person_details(person_id: int, lang_config: dict | None = None) -> tuple[dict, dict]:
    """Kişi detayını TR ve EN olarak paralel çeker (detay sayfası için).

    Returns:
        (tr_data, en_data) — Birleştirme (merge) işlemi çağıran tarafta yapılır.
    """
    return await fetch_bilingual(
        f"person/{person_id}",
        params={"append_to_response": "combined_credits"},
        lang_config=lang_config,
    )


async def get_all_certifications() -> dict:
    """Tüm film ve dizi sertifikalarını TMDB'den çeker."""
    movie_task = fetch("certification/movie/list")
    series_task = fetch("certification/tv/list")
    
    movie_certs, series_certs = await asyncio.gather(movie_task, series_task)
    return {
        "movie": movie_certs.get("certifications", {}),
        "series": series_certs.get("certifications", {})
    }


async def get_watch_providers(media_type: str, item_id: int) -> dict:
    """İçeriğin hangi platformlarda yayınlandığını getirir (JustWatch verisi)."""
    tmdb_type = "tv" if media_type == "series" else media_type
    data = await fetch(f"{tmdb_type}/{item_id}/watch/providers")
    return data.get("results", {})


async def get_all_watch_providers(media_type: str = "movie", region: str = "TR", lang: str = "tr-TR") -> list[dict]:
    """Belirli bir bölgedeki tüm izleme servislerini getirir."""
    tmdb_type = "tv" if media_type == "series" else media_type
    data = await fetch(f"watch/providers/{tmdb_type}", params={"watch_region": region, "language": lang})
    return data.get("results", [])


# ──────────────────────────────────────────────────────────
# Yapılandırma (Configuration) Endpoint'leri
# ──────────────────────────────────────────────────────────


async def get_genres(media_type: str = "movie", lang: str = "tr-TR") -> list[dict]:
    """Tüm türlerin listesini getirir."""
    tmdb_type = "tv" if media_type == "series" else media_type
    data = await fetch(f"genre/{tmdb_type}/list", params={"language": lang})
    return data.get("genres", [])


async def get_countries(lang: str = "tr-TR") -> list[dict]:
    """Tüm ülkelerin listesini getirir."""
    return await fetch("configuration/countries", params={"language": lang})


async def get_languages() -> list[dict]:
    """Tüm dillerin listesini getirir."""
    return await fetch("configuration/languages")


# ──────────────────────────────────────────────────────────
# Hidrasyon (Hydration) Yardımcıları
# ──────────────────────────────────────────────────────────


async def get_batch_details(items: list[tuple[str, int]], lang_config: dict | None = None) -> list[dict]:
    """Birden fazla içeriğin (film/dizi) temel bilgilerini paralel çeker."""
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
    """Birden fazla kişinin temel bilgilerini paralel çeker."""
    if not person_ids:
        return []
        
    lang = lang_config["primary"] if lang_config else PRIMARY_LANGUAGE
    
    tasks = []
    for pid in person_ids:
        tasks.append(fetch(f"person/{pid}", params={"language": lang}))
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r if not isinstance(r, Exception) else {} for r in results]
