import json
import os
import time
from typing import Any

from app.services import tmdb_client

# Önbellek: {cache_key: {"data": value, "expiry": timestamp}}
_metadata_cache = {}
CACHE_TTL = 3600 * 24  # 24 saat (Metadata nadir değişir)

# Yerel çeviri dosyası
LOCAL_TRANSLATIONS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "constants", "translations.json"
)

def load_local_translations() -> dict:
    try:
        with open(LOCAL_TRANSLATIONS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"tr": {}, "en": {}}

class MetadataService:
    def __init__(self):
        self.translations = load_local_translations()

    async def get_cached_metadata(self, key: str, fetch_func) -> Any:
        now = time.time()
        if key in _metadata_cache and _metadata_cache[key]["expiry"] > now:
            return _metadata_cache[key]["data"]

        data = await fetch_func()
        _metadata_cache[key] = {"data": data, "expiry": now + CACHE_TTL}
        return data

    async def get_genres(self, media_type: str, lang: str = "tr-TR") -> dict[int, str]:
        cache_key = f"genres:{media_type}:{lang}"
        genres_list = await self.get_cached_metadata(
            cache_key, lambda: tmdb_client.get_genres(media_type, lang)
        )
        return {g["id"]: g["name"] for g in genres_list}

    async def get_countries(self, lang: str = "tr-TR") -> dict[str, str]:
        cache_key = f"countries:{lang}"
        countries_list = await self.get_cached_metadata(
            cache_key, lambda: tmdb_client.get_countries(lang)
        )
        return {c["iso_3166_1"]: c.get("native_name") or c.get("english_name") for c in countries_list}

    async def get_languages(self) -> dict[str, str]:
        """Tüm dillerin (iso_639_1: english_name) mapini döner."""
        cache_key = "languages:all"
        lang_list = await self.get_cached_metadata(
            cache_key, tmdb_client.get_languages
        )
        # TMDB diller listesi genelde {iso_639_1, english_name, name} döner.
        return {l["iso_639_1"]: l.get("english_name") or l.get("name") for l in lang_list}

    async def get_watch_providers(self, media_type: str, region: str = "TR", lang: str = "tr-TR") -> list[dict]:
        """Belirli bir bölgedeki izleme servislerini getirir."""
        cache_key = f"watch_providers:{media_type}:{region}:{lang}"
        providers_list = await self.get_cached_metadata(
            cache_key, lambda: tmdb_client.get_all_watch_providers(media_type, region, lang)
        )
        return providers_list

    def translate(self, category: str, key: str, lang: str = "tr") -> str:
        """
        Yerel kayıtlı çevirileri döner. 
        Eğer çeviri yoksa [T] ile işaretleyip orijinali döner.
        """
        l_code = lang[:2].lower()
        lang_map = self.translations.get(l_code, self.translations.get("tr", {}))
        
        category_map = lang_map.get(category, {})
        
        if key in category_map:
            return category_map[key]
        
        # Fallback to English if not in requested lang
        if l_code != "en":
            en_map = self.translations.get("en", {}).get(category, {})
            if key in en_map:
                # Indicate missing Turkish translation
                return f"[T] {en_map[key]}"
        
        # Absolute fallback: Original key with marker
        return f"[T] {key}"

metadata_service = MetadataService()
