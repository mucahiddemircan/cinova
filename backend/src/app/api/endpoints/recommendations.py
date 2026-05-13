"""Kişiselleştirilmiş içerik öneri endpointleri.

Takip edilen kişilerin yeni işleri, tür bazlı keşif ve
mevcut listeye benzer içerik önerilerini sunar.

Her öneri kategorisi film ve dizi olarak ayrı ayrı döndürülür.
"""

import asyncio
import math
import random
from collections import Counter
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.core.datetime_utils import utc_now
from app.dependencies import get_current_user, get_lang_config
from app.models import (
    User,
    Follow,
    LibraryItem,
    ContentReadBasic,
    PersonalizedRecommendationsRead,
)
from app.services import tmdb_client
from app.utils.i18n_utils import translate_job, resolve_person_name, translate_role_name
from app.utils.content_converters import transform_content, merge_person_data

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# Basit in-memory cache: {user_id: {"data": recommendations, "timestamp": datetime}}
_recommendations_cache = {}
CACHE_EXPIRY_SECONDS = 3600  # 1 saat


def invalidate_user_cache(user_id: int):
    """Kullanıcının öneri cache'ini temizler.
    
    Watchlist, interaction veya follow değişikliklerinde çağrılmalıdır.
    """
    _recommendations_cache.pop(user_id, None)


# ──────────────────────────────────────────────────────────
# Yardımcı Fonksiyonlar
# ──────────────────────────────────────────────────────────


async def _get_excluded_content_ids(user_id: int, session: AsyncSession) -> set[int]:
    """Kullanıcının zaten bildiği (watchlist + etkileşim) tüm TMDB ID'lerini toplar."""
    result = await session.exec(
        select(LibraryItem.tmdb_id).where(LibraryItem.user_id == user_id)
    )
    return set(result.all())


def _calculate_seed_weight(item: LibraryItem) -> float:
    """LibraryItem öğesine 'bu içerikten yeni öneri üretme potansiyeli' skoru verir.
    
    Ağırlık faktörleri:
    - Status: is_watched → yüksek, is_watchlist → orta
    - Interaction: is_liked → çok yüksek
    - Rating: Kullanıcının verdiği puan (varsa)
    - Recency: Yeni eklenenler daha önemli (time-decay)
    """
    weight = 1.0
    
    # 1. Durum ağırlıkları
    if item.is_watched:
        weight *= 2.0
    if item.is_liked:
        weight *= 3.0
    if item.is_watchlist and not item.is_watched:
        weight *= 0.5
    
    # 2. Rating ağırlığı (varsa)
    if item.rating:
        weight *= (item.rating / 10.0) * 2  # 10/10 → 2x, 5/10 → 1x
    
    # 3. Recency — yeni eklenenler daha önemli
    if item.created_at:
        try:
            # Ensure timezone awareness
            created_at = item.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
                
            months_ago = (utc_now() - created_at).days / 30
            weight *= math.exp(-0.05 * months_ago)  # ~14 ayda yarı değer
        except Exception:
            pass
    
    return max(weight, 0.1)


def _score_recommendation(item: dict) -> float:
    """Önerilen içeriğe vote + popularity bazlı alaka skoru verir."""
    vote = item.get("vote_average", 0) or 0
    pop = item.get("popularity", 0) or 0
    
    vote_score = vote / 10.0
    pop_score = min(math.log10(max(pop, 1)) / 3, 1.0)
    
    return (vote_score * 0.6) + (pop_score * 0.4)


def _calculate_genre_weight(item_created_at: datetime, base_weight: float) -> float:
    """Etkileşim tarihine göre time-decay ağırlık hesaplar.
    
    Her ay %8 azalır, ~8 ayda yarı değer.
    """
    if not item_created_at:
        return base_weight
        
    try:
        # Ensure timezone awareness
        created_at = item_created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
            
        now = utc_now()
        # Avoid negative months_ago if created_at is somehow in future
        diff = (now - created_at).days
        months_ago = max(diff / 30, 0)
        
        # Limit decay to [0, 1] range
        decay = math.exp(-0.08 * months_ago)
        return base_weight * max(min(decay, 1.0), 0.01)
    except Exception as e:
        import logging
        logging.error(f"Error in _calculate_genre_weight: {e}")
        return base_weight


def _score_followed_work(item: dict, rel_date: str) -> float:
    """Takip edilen kişilerin işlerini tarih + kalite ile skorlar."""
    score = 0.0
    
    # 1. Tarih yakınlığı
    if rel_date:
        try:
            release = datetime.strptime(rel_date, "%Y-%m-%d")
            now = datetime.now()
            days_diff = (release - now).days
            
            if days_diff > 0:
                # Yakında çıkacak → yüksek boost
                score += max(2.0 - (days_diff / 180), 0.5)
            else:
                # Geçmişte çıkmış → recency skoru
                score += max(1.5 - (abs(days_diff) / 365), 0)
        except ValueError:
            pass
    
    # 2. TMDB vote average
    vote = item.get("vote_average", 0) or 0
    score += (vote / 10.0) * 1.0
    
    # 3. Popülerlik
    pop = item.get("popularity", 0) or 0
    score += min(math.log10(max(pop, 1)) / 3, 0.5)
    
    return score


# ──────────────────────────────────────────────────────────
# Ana Endpoint
# ──────────────────────────────────────────────────────────


@router.get("/personalized", response_model=PersonalizedRecommendationsRead)
async def get_personalized_recommendations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    lang_config: dict = Depends(get_lang_config),
):
    """Kullanıcıya özel önerileri (takip ettikleri, sevdiği türler, listeleri) bir arada getirir.
    
    Her kategori film ve dizi olarak ayrı ayrı döndürülür.
    Performans için 1 saatlik basit bir cache mekanizması kullanılır.
    """
    now = utc_now()
    
    # Cache kontrolü
    if current_user.id in _recommendations_cache:
        cache_entry = _recommendations_cache[current_user.id]
        if (now - cache_entry["timestamp"]).total_seconds() < CACHE_EXPIRY_SECONDS:
            return cache_entry["data"]

    # 1. Ortak verileri SEQUENTIAL (SIRALI) çekerek InterfaceError'u önle
    # Negatif filtreleme seti
    excluded_ids = await _get_excluded_content_ids(current_user.id, session)
    
    # Takip edilen kişiler
    follow_result = await session.exec(select(Follow).where(Follow.follower_id == current_user.id))
    follows = follow_result.all()
    
    # İzleme listesi ve Etkileşimler (Tümü)
    library_result = await session.exec(select(LibraryItem).where(LibraryItem.user_id == current_user.id))
    library_items = library_result.all()
    
    # Seed verileri ayır
    watchlist_seeds = [i for i in library_items if i.is_watchlist or i.is_watched]
    
    # 2. API çağrılarını PARALEL çalıştır (Session kullanmadan)
    followed_works_task = _get_followed_persons_works(follows, excluded_ids, lang_config=lang_config)
    genre_recs_task = _get_genre_based_recommendations(library_items, excluded_ids, lang_config=lang_config)
    list_recs_task = _get_list_based_recommendations(watchlist_seeds, excluded_ids, lang_config=lang_config)

    # return_exceptions=True ile bir task çökse bile diğerleri devam eder
    results = await asyncio.gather(
        followed_works_task, genre_recs_task, list_recs_task,
        return_exceptions=True
    )
    
    # Sonuçları güvenli şekilde ayıkla
    def safe_get(res, key):
        if isinstance(res, Exception):
            import logging
            logging.error(f"Recommendation task failed: {res}")
            return []
        return res.get(key, [])

    followed_result = results[0]
    genre_result = results[1]
    list_result = results[2]

    recommendations = {
        "followed_works_movies": safe_get(followed_result, "movies"),
        "followed_works_series": safe_get(followed_result, "series"),
        "genre_recommendations_movies": safe_get(genre_result, "movies"),
        "genre_recommendations_series": safe_get(genre_result, "series"),
        "list_recommendations_movies": safe_get(list_result, "movies"),
        "list_recommendations_series": safe_get(list_result, "series"),
    }
    
    # Cache'e kaydet (sadece veriler tamsa veya makul ölçüde veri varsa)
    _recommendations_cache[current_user.id] = {
        "data": recommendations,
        "timestamp": now
    }

    return recommendations


async def get_type_recommendations(
    user: User,
    media_type: str,
    session: AsyncSession,
    lang_config: dict
) -> dict:
    """Belirli bir medya türü (movie/series) için tüm kişiselleştirilmiş önerileri birleştirir.
    
    CategoryView (Daha Fazla Gör) sayfası için kullanılır.
    """
    # Önce cache kontrolü (Eğer ana personalized cache varsa oradan ayıkla)
    now = utc_now()
    if user.id in _recommendations_cache:
        cache_entry = _recommendations_cache[user.id]
        if (now - cache_entry["timestamp"]).total_seconds() < CACHE_EXPIRY_SECONDS:
            data = cache_entry["data"]
            merged = []
            seen_ids = set()
            
            # İlgili medya türündeki tüm kategorileri birleştir
            suffix = "movies" if media_type == "movie" else "series"
            for key in [f"followed_works_{suffix}", f"genre_recommendations_{suffix}", f"list_recommendations_{suffix}"]:
                for item in data.get(key, []):
                    if item["id"] not in seen_ids:
                        merged.append(item)
                        seen_ids.add(item["id"])
            
            return {
                "results": merged,
                "page": 1,
                "total_pages": 1,
                "total_results": len(merged)
            }

    # Cache yoksa veya eskiyse, verileri çek (personalized logic'in basitleştirilmiş hali)
    excluded_ids = await _get_excluded_content_ids(user.id, session)
    follow_result = await session.exec(select(Follow).where(Follow.follower_id == user.id))
    follows = follow_result.all()
    library_result = await session.exec(select(LibraryItem).where(LibraryItem.user_id == user.id))
    library_items = library_result.all()
    watchlist_seeds = [i for i in library_items if i.is_watchlist or i.is_watched]

    results = await asyncio.gather(
        _get_followed_persons_works(follows, excluded_ids, lang_config=lang_config),
        _get_genre_based_recommendations(library_items, excluded_ids, lang_config=lang_config),
        _get_list_based_recommendations(watchlist_seeds, excluded_ids, lang_config=lang_config),
        return_exceptions=True
    )

    merged = []
    seen_ids = set()
    target_key = "movies" if media_type == "movie" else "series"

    for res in results:
        if isinstance(res, Exception) or not res:
            continue
        items = res.get(target_key, [])
        for item in items:
            if item["id"] not in seen_ids:
                merged.append(item)
                seen_ids.add(item["id"])

    return {
        "results": merged,
        "page": 1,
        "total_pages": 1,
        "total_results": len(merged)
    }


# ──────────────────────────────────────────────────────────
# Algoritma 1: Takip Edilen Kişilerin Yeni İşleri
# ──────────────────────────────────────────────────────────


async def _get_followed_persons_works(
    follows: list[Follow], excluded_ids: set[int], lang_config: dict | None = None
) -> dict[str, list]:
    """Kullanıcının takip ettiği kişilerin yeni/gelecek işlerini getirir.
    """
    person_ids = [f.followed_person_id for f in follows if f.followed_person_id]
    
    if not person_ids:
        return {"movies": [], "series": []}

    # Dinamik tarih sınırları
    now_dt = utc_now()
    cutoff_date = (now_dt - timedelta(days=365)).strftime("%Y-%m-%d")
    future_cutoff = (now_dt + timedelta(days=365)).strftime("%Y-%m-%d")

    # API rate limit koruması — max 5 eşzamanlı istek
    MAX_PERSONS = 15
    semaphore = asyncio.Semaphore(5)
    
    async def _fetch_with_limit(pid):
        async with semaphore:
            return await tmdb_client.get_person_brief(pid, lang_config=lang_config)

    tasks = [_fetch_with_limit(pid) for pid in person_ids[:MAX_PERSONS]]
    persons_data = await asyncio.gather(*tasks, return_exceptions=True)

    # w_id -> {content: dict, persons: {p_id: {name, roles}}, rel_date: str, media_type: str}
    grouped_works = {}

    for data in persons_data:
        if isinstance(data, Exception) or not data:
            continue
            
        p_name, _ = resolve_person_name(data)
        p_id = data.get("id")
        credits = data.get("combined_credits", {})
        
        # Cast (Oyuncular)
        lang = lang_config["lang"] if lang_config else "tr"
        for cast_item in credits.get("cast", []):
            w_id = cast_item.get("id")
            rel_date = cast_item.get("release_date") or cast_item.get("first_air_date")
            
            if rel_date and cutoff_date <= rel_date <= future_cutoff:
                # Negatif filtreleme
                if w_id in excluded_ids:
                    continue
                    
                role = translate_role_name(cast_item.get("character"), lang=lang)
                if not role:
                    continue
                
                media_type = cast_item.get("media_type", "movie")
                
                if w_id not in grouped_works:
                    grouped_works[w_id] = {
                        "content": transform_content(cast_item, lang=lang),
                        "persons": {p_id: {"name": p_name, "roles": {role}}},
                        "rel_date": rel_date,
                        "media_type": media_type,
                    }
                else:
                    if p_id not in grouped_works[w_id]["persons"]:
                        grouped_works[w_id]["persons"][p_id] = {"name": p_name, "roles": {role}}
                    else:
                        grouped_works[w_id]["persons"][p_id]["roles"].add(role)
        
        # Crew (Yönetmen vb)
        for crew_item in credits.get("crew", []):
            w_id = crew_item.get("id")
            rel_date = crew_item.get("release_date") or crew_item.get("first_air_date")
            
            if rel_date and cutoff_date <= rel_date <= future_cutoff:
                if w_id in excluded_ids:
                    continue
                    
                role = translate_job(crew_item.get("job"), lang=lang)
                if not role:
                    continue
                
                media_type = crew_item.get("media_type", "movie")
                
                if w_id not in grouped_works:
                    grouped_works[w_id] = {
                        "content": transform_content(crew_item, lang=lang),
                        "persons": {p_id: {"name": p_name, "roles": {role}}},
                        "rel_date": rel_date,
                        "media_type": media_type,
                    }
                else:
                    if p_id not in grouped_works[w_id]["persons"]:
                        grouped_works[w_id]["persons"][p_id] = {"name": p_name, "roles": {role}}
                    else:
                        grouped_works[w_id]["persons"][p_id]["roles"].add(role)

    # Final listeleri oluştur — film ve dizi ayrı
    movies_list = []
    series_list = []
    
    for w_id, data in grouped_works.items():
        content = data["content"]
        
        person_strings = []
        for p_data in data["persons"].values():
            roles_str = ", ".join(sorted(list(p_data["roles"])))
            person_strings.append(f"{p_data['name']}: {roles_str}")
        
        # @pers@ prefix'i ve yeni satır ayracı
        content["description"] = "@pers@" + "\n".join(person_strings)
        content["role"] = None
        
        # Hibrit sıralama skoru ekle
        content["_score"] = _score_followed_work(content, data["rel_date"])
        
        if data["media_type"] in ("tv", "series"):
            series_list.append(content)
        else:
            movies_list.append(content)

    # Skora göre sırala
    movies_list.sort(key=lambda x: x.pop("_score", 0), reverse=True)
    series_list.sort(key=lambda x: x.pop("_score", 0), reverse=True)
    
    return {
        "movies": movies_list[:15],
        "series": series_list[:15],
    }


# ──────────────────────────────────────────────────────────
# Algoritma 2: Tür Bazlı Öneriler
# ──────────────────────────────────────────────────────────


async def _get_genre_based_recommendations(
    library_items: list[LibraryItem], excluded_ids: set[int], lang_config: dict | None = None
) -> dict[str, list]:
    """Kullanıcının listelerindeki ve beğendiği içeriklerin türlerine göre öneriler getirir.
    """
    genre_counts = Counter()
    
    for item in library_items:
        if item.genre_ids:
            try:
                g_ids = [int(g.strip()) for g in item.genre_ids.split(",") if g.strip().isdigit()]
                
                # Ağırlık hesapla (is_watched, is_liked, is_watchlist)
                base_weight = 1.0
                if item.is_liked:
                    base_weight = 3.0
                elif item.is_watched:
                    base_weight = 2.0
                elif item.is_watchlist:
                    base_weight = 0.5
                
                # Time-decay uygula
                weight = _calculate_genre_weight(item.created_at, base_weight)
                
                for gid in g_ids:
                    genre_counts[gid] += weight
            except Exception:
                continue

    if not genre_counts:
        return {"movies": [], "series": []}

    # En çok tercih edilen top 4 türü al
    top_genres = [(gid, score) for gid, score in genre_counts.most_common(4)]
    
    # Her tür için ayrı Discover çağrısı — film ve dizi ayrı ayrı (paralel)
    discover_tasks = []
    task_meta = []  # (genre_score, media_type) bilgisi
    
    for gid, score in top_genres:
        params = {
            "with_genres": str(gid),
            "sort_by": "vote_average.desc",
            "vote_count.gte": 100,
            "vote_average.gte": 6.0,
        }
        # Film
        discover_tasks.append(tmdb_client.discover_content("movie", params, lang_config=lang_config))
        task_meta.append((score, "movie"))
        # Dizi
        discover_tasks.append(tmdb_client.discover_content("series", params, lang_config=lang_config))
        task_meta.append((score, "tv"))

    api_results = await asyncio.gather(*discover_tasks, return_exceptions=True)

    movies_pool = []
    series_pool = []
    seen_ids = set()
    
    for i, result in enumerate(api_results):
        if isinstance(result, Exception) or not result:
            continue
        genre_score, media_type = task_meta[i]
        
        for item in result.get("results", []):
            item_id = item.get("id")
            # Negatif filtreleme + dedup
            if item_id in excluded_ids or item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            
            lang = lang_config["lang"] if lang_config else "tr"
            content = transform_content(item, lang=lang)
            # Tür ağırlığı + TMDB vote ile hibrit skor
            rec_score = (genre_score * 0.4) + _score_recommendation(content) * 10
            content["_rec_score"] = rec_score
            
            if media_type in ("tv", "series"):
                series_pool.append(content)
            else:
                movies_pool.append(content)

    # Skora göre sırala ve temizle
    movies_pool.sort(key=lambda x: x.pop("_rec_score", 0), reverse=True)
    series_pool.sort(key=lambda x: x.pop("_rec_score", 0), reverse=True)
    
    return {
        "movies": movies_pool[:15],
        "series": series_pool[:15],
    }


# ──────────────────────────────────────────────────────────
# Algoritma 3: Listelere Benzer İçerik Önerileri
# ──────────────────────────────────────────────────────────


async def _get_list_based_recommendations(
    watchlist_items: list[LibraryItem], excluded_ids: set[int], lang_config: dict | None = None
) -> dict[str, list]:
    """Listelerdeki spesifik içeriklere benzer öneriler getirir.
    """
    if not watchlist_items:
        return {"movies": [], "series": []}
    
    # Film ve dizi seed'lerini ayır
    movie_items = [i for i in watchlist_items if i.media_type == "movie"]
    series_items = [i for i in watchlist_items if i.media_type in ("series", "tv")]
    
    async def _get_recs_for_type(type_items: list, tmdb_media_type: str) -> list:
        """Belirli bir medya türü için ağırlıklı seed seçimi ve öneri üretimi."""
        if not type_items:
            return []
        
        # Ağırlıklı seed seçimi
        weights = [_calculate_seed_weight(item) for item in type_items]
        k = min(len(type_items), 5)
        selected_items = random.choices(type_items, weights=weights, k=k)
        
        # Seçelen seed'lerden benzerleri çek (paralel)
        tasks = [tmdb_client.get_recommendations(tmdb_media_type, item.tmdb_id, lang_config=lang_config) for item in selected_items]
        recs_data_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_recs = []
        seen_ids = set()
        
        for recs_data in recs_data_list:
            if isinstance(recs_data, Exception) or not recs_data:
                continue
            
            for rec in recs_data.get("results", []):
                r_id = rec.get("id")
                # Negatif filtreleme + dedup
                if r_id in excluded_ids or r_id in seen_ids:
                    continue
                seen_ids.add(r_id)
                
                lang = lang_config["lang"] if lang_config else "tr"
                content = transform_content(rec, lang=lang)
                content["_rec_score"] = _score_recommendation(content)
                all_recs.append(content)
        
        # Skora göre sırala ve temizle
        all_recs.sort(key=lambda x: x.pop("_rec_score", 0), reverse=True)
        return all_recs[:15]
    
    # Film ve dizi önerilerini paralel çek
    movies_recs, series_recs = await asyncio.gather(
        _get_recs_for_type(movie_items, "movie"),
        _get_recs_for_type(series_items, "series"),
    )
    
    return {
        "movies": movies_recs,
        "series": series_recs,
    }
