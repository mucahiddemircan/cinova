from app.utils.image_utils import build_image_url
from app.utils.i18n_utils import (
    translate_job, 
    translate_department, 
    translate_role_name, 
    resolve_title, 
    resolve_person_name,
    is_latin
)

def merge_list_results(
    primary_results: list[dict], secondary_results: list[dict] | None, is_person: bool = False
) -> list[dict]:
    """İki dildeki liste sonuçlarını birleştirir. Yedek verileri _fallback_ ile saklar.
    Her iki listedeki benzersiz öğeleri birleştirir (Union).
    """
    secondary_results = secondary_results or []
    sec_map = {item.get("id"): item for item in secondary_results if item.get("id")}
    merged_list = []
    seen_ids = set()

    # 1. Birincil sonuçları işle (ve ikincil verilerle zenginleştir)
    for p_item in primary_results:
        item_id = p_item.get("id")
        if not item_id:
            continue
        seen_ids.add(item_id)
        
        s_item = sec_map.get(item_id, {})
        merged_item = {**p_item}
        
        media_type = merged_item.get("media_type")

        if is_person or media_type == "person":
            merged_item["_fallback_name"] = s_item.get("name")
        else:
            merged_item["_fallback_title"] = s_item.get("title") or s_item.get("name")
            merged_item["_fallback_overview"] = s_item.get("overview")

        # Görsel fallback
        for field in ("poster_path", "backdrop_path", "profile_path"):
            if not merged_item.get(field) and s_item.get(field):
                merged_item[field] = s_item.get(field)

        merged_list.append(merged_item)

    # 2. Sadece ikincil sonuçlarda olanları ekle (Fallback)
    for s_item in secondary_results:
        item_id = s_item.get("id")
        if not item_id or item_id in seen_ids:
            continue
        
        merged_item = {**s_item}
        media_type = merged_item.get("media_type")
        
        if is_person or media_type == "person":
            merged_item["_fallback_name"] = s_item.get("name")
        else:
            merged_item["_fallback_title"] = s_item.get("title") or s_item.get("name")
            merged_item["_fallback_overview"] = s_item.get("overview")
            
        merged_list.append(merged_item)

    return merged_list


def merge_content_data(primary_data: dict, secondary_data: dict | None) -> dict:
    """Birincil ve ikincil içerik verisini birleştirir."""
    merged = {**primary_data}
    s_data = secondary_data or {}

    merged["_fallback_overview"] = s_data.get("overview")
    merged["_fallback_tagline"] = s_data.get("tagline")
    merged["_fallback_title"] = s_data.get("name") if s_data.get("name") else s_data.get("title")

    for field in ("poster_path", "backdrop_path"):
        if not merged.get(field) and s_data.get(field):
            merged[field] = s_data[field]

    p_credits = merged.get("credits", {})
    s_credits = s_data.get("credits", {})
    if p_credits:
        merged["credits"] = {
            "cast": merge_list_results(p_credits.get("cast", []), s_credits.get("cast", []), is_person=True),
            "crew": merge_list_results(p_credits.get("crew", []), s_credits.get("crew", []), is_person=True)
        }

    p_agg = merged.get("aggregate_credits", {})
    s_agg = s_data.get("aggregate_credits", {})
    if p_agg:
        merged["aggregate_credits"] = {
            "cast": merge_list_results(p_agg.get("cast", []), s_credits.get("cast", []), is_person=True),
            "crew": merge_list_results(p_agg.get("crew", []), s_credits.get("crew", []), is_person=True)
        }

    p_videos = primary_data.get("videos", {}).get("results", [])
    s_videos = s_data.get("videos", {}).get("results", [])
    merged["videos"] = {"results": p_videos + s_videos}

    p_seasons = primary_data.get("seasons", [])
    s_seasons = s_data.get("seasons", [])
    if p_seasons:
        merged["seasons"] = merge_list_results(p_seasons, s_seasons, is_person=False)

    return merged


def merge_person_data(primary_data: dict, secondary_data: dict | None) -> dict:
    """Birincil ve ikincil kişi verisini birleştirir."""
    merged = {**primary_data}
    s_data = secondary_data or {}

    merged["_fallback_biography"] = s_data.get("biography")
    merged["_fallback_name"] = s_data.get("name")
    merged["_fallback_original_name"] = s_data.get("original_name")

    if not merged.get("place_of_birth") and s_data.get("place_of_birth"):
        merged["place_of_birth"] = s_data["place_of_birth"]

    if not merged.get("profile_path") and s_data.get("profile_path"):
        merged["profile_path"] = s_data["profile_path"]

    p_credits = merged.get("combined_credits", {})
    s_credits = s_data.get("combined_credits", {})
    if p_credits:
        merged["combined_credits"] = {
            "cast": merge_list_results(p_credits.get("cast", []), s_credits.get("cast", []), is_person=False),
            "crew": merge_list_results(p_credits.get("crew", []), s_credits.get("crew", []), is_person=False)
        }

    return merged


def extract_certification(item: dict, media_type: str) -> str | None:
    """TMDB verisinden yaş sınırını (certification) ayıklar."""
    if media_type == "movie":
        results = item.get("release_dates", {}).get("results", [])
        for country in ["TR", "US"]:
            for res in results:
                if res.get("iso_3166_1") == country:
                    for rd in res.get("release_dates", []):
                        cert = rd.get("certification")
                        if cert:
                            return cert
        for res in results:
            for rd in res.get("release_dates", []):
                cert = rd.get("certification")
                if cert:
                    return cert
    elif media_type in ("tv", "series"):
        results = item.get("content_ratings", {}).get("results", [])
        for country in ["TR", "US"]:
            for res in results:
                if res.get("iso_3166_1") == country:
                    cert = res.get("rating")
                    if cert:
                        return cert
        for res in results:
            cert = res.get("rating")
            if cert:
                return cert
    return None


def transform_content(item: dict, backdrop_size: str = "w1280", lang: str = "tr") -> dict:
    """TMDB içerik verisini ContentReadBasic şemasına dönüştürür."""
    media_type = item.get("media_type")
    if not media_type:
        media_type = "movie" if "title" in item else "series"
    
    if media_type == "tv":
        media_type = "series"

    display_title, original_title = resolve_title(item, lang)
    
    # Overview Çözümleme
    overview = item.get("overview")
    fallback_overview = item.get("_fallback_overview")
    
    if lang[:2].lower() == "en":
        display_overview = overview or fallback_overview
    else:
        # Eğer TR veri orijinal veriye çok benziyorsa (boşsa veya orijinal dil ise) yedek dile düş
        if (not overview or overview == "") and fallback_overview:
            display_overview = fallback_overview
        else:
            display_overview = overview or fallback_overview

    # Görsel Çözümleme Heuristics
    p_poster = item.get("poster_path")
    f_poster = item.get("_fallback_poster_path")
    p_backdrop = item.get("backdrop_path")
    f_backdrop = item.get("_fallback_backdrop_path")
    
    localized_title = item.get("title") or item.get("name")
    fallback_title = item.get("_fallback_title")
    original_title_val = item.get("original_title") or item.get("original_name")
    is_tr_content = item.get("original_language") == "tr"
    
    final_poster = p_poster or f_poster
    final_backdrop = p_backdrop or f_backdrop
    
    # Başlıkta Latin alfabesi veya eksiklikten dolayı fallback'e düşüldüyse, 
    # posterde de İngilizceyi tercih et (Orijinal poster muhtemelen non-latin olduğu için).
    if f_poster and f_poster != p_poster:
        if not is_latin(localized_title) and is_latin(fallback_title):
            final_poster = f_poster
        elif localized_title == original_title_val and not is_tr_content:
            final_poster = f_poster
            
    if f_backdrop and f_backdrop != p_backdrop:
        if not is_latin(localized_title) and is_latin(fallback_title):
            final_backdrop = f_backdrop
        elif localized_title == original_title_val and not is_tr_content:
            final_backdrop = f_backdrop

    # Rol bilgisi (Kişi portfolyosu için)
    role = item.get("role")
    if not role:
        if item.get("character"):
            l_code = lang[:2].lower()
            role_prefix = "Actor" if l_code == "en" else "Oyuncu"
            role = f"{role_prefix} ({translate_role_name(item['character'], lang)})"
        elif item.get("job"):
            role = translate_job(item.get("job"), lang)

    return {
        "id": item.get("id"),
        "title": display_title,
        "original_title": original_title,
        "tagline": item.get("tagline") or item.get("_fallback_tagline"),
        "description": display_overview,
        "type": media_type,
        "poster_path": build_image_url(final_poster),
        "backdrop_path": build_image_url(final_backdrop, size=backdrop_size),
        "release_date": item.get("release_date") or item.get("first_air_date"),
        "vote_average": item.get("vote_average"),
        "popularity": item.get("popularity"),
        "role": role,
        "genre_ids": item.get("genre_ids") or ([g.get("id") for g in item.get("genres", [])] if item.get("genres") else []),
        "trailer_key": _extract_trailer_key(item.get("videos", {}).get("results", [])),
        "certification": extract_certification(item, media_type),
    }


def _extract_trailer_key(videos: list[dict]) -> str | None:
    """Video listesi içinden en uygun YouTube fragman anahtarını döner."""
    if not videos:
        return None
    trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer"]
    if trailers:
        return trailers[0].get("key")
    teasers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Teaser"]
    if teasers:
        return teasers[0].get("key")
    any_yt = [v for v in videos if v.get("site") == "YouTube"]
    if any_yt:
        return any_yt[0].get("key")
    return None


def transform_person(item: dict, lang: str = "tr") -> dict:
    """TMDB kişi verisini PersonReadBasic şemasına dönüştürür."""
    display_name, original_name = resolve_person_name(item, lang)
    dept = item.get("known_for_department")
    return {
        "id": item.get("id"),
        "name": display_name,
        "original_name": original_name,
        "profile_path": build_image_url(item.get("profile_path")),
        "known_for_department": translate_department(dept, lang),
        "popularity": item.get("popularity"),
    }


def merge_season_data(primary_data: dict, secondary_data: dict | None) -> dict:
    """Birincil ve ikincil sezon verilerini birleştirir."""
    merged = {**primary_data}
    s_data = secondary_data or {}
    
    merged["_fallback_overview"] = s_data.get("overview")
    merged["_fallback_name"] = s_data.get("name")
    
    p_episodes = {ep.get("id"): ep for ep in primary_data.get("episodes", [])}
    s_episodes = {ep.get("id"): ep for ep in s_data.get("episodes", [])}
    
    merged_episodes = []
    for ep_id, p_ep in p_episodes.items():
        s_ep = s_episodes.get(ep_id, {})
        merged_ep = {**p_ep}
        merged_ep["_fallback_overview"] = s_ep.get("overview")
        merged_ep["_fallback_name"] = s_ep.get("name")
        merged_episodes.append(merged_ep)
        
    merged["episodes"] = merged_episodes
    return merged


def transform_season(item: dict, lang: str = "tr") -> dict:
    """Sezon ve bölüm verilerini SeasonDetailRead şemasına dönüştürür."""
    l_code = lang[:2].lower()
    
    def resolve_field(obj, field, fallback_field):
        if l_code == "en":
            return obj.get(field) or obj.get(fallback_field)
        return obj.get(field) or obj.get(fallback_field)

    episodes = []
    for ep in item.get("episodes", []):
        episodes.append({
            "id": ep.get("id"),
            "name": resolve_field(ep, "name", "_fallback_name"),
            "episode_number": ep.get("episode_number"),
            "overview": resolve_field(ep, "overview", "_fallback_overview"),
            "air_date": ep.get("air_date"),
            "runtime": ep.get("runtime"),
            "still_path": build_image_url(ep.get("still_path")),
            "vote_average": ep.get("vote_average"),
        })

    return {
        "id": item.get("id"),
        "name": resolve_field(item, "name", "_fallback_name"),
        "season_number": item.get("season_number"),
        "episode_count": len(episodes),
        "air_date": item.get("air_date"),
        "poster_path": build_image_url(item.get("poster_path")),
        "overview": resolve_field(item, "overview", "_fallback_overview"),
        "episodes": episodes
    }
