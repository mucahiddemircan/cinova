from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_lang_config, get_series_service
from app.models import (
    ContentReadBasic,
    ContentDetailRead,
    SeasonDetailRead,
    CastRead,
    PaginatedContentRead,
)
from app.services.series_service import SeriesService
from app.utils.content_converters import transform_content
from app.services import tmdb_client
from app.api.endpoints.recommendations import get_type_recommendations
from app.core.database import get_session
from sqlmodel.ext.asyncio.session import AsyncSession
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/series", tags=["series"])

@router.get("/popular", response_model=PaginatedContentRead)
async def get_popular_series(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    return await discover_series(
        page=page, 
        sort_by="popularity.desc", 
        lang_config=lang_config
    )

@router.get("/on-the-air", response_model=PaginatedContentRead)
async def get_on_the_air_series(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    from datetime import datetime, timedelta
    now = datetime.now()
    future_date = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    return await discover_series(
        page=page, 
        sort_by="popularity.desc", 
        first_air_date_lte=future_date,
        lang_config=lang_config
    )

@router.get("/top-rated", response_model=PaginatedContentRead)
async def get_top_rated_series(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    return await discover_series(
        page=page, 
        sort_by="vote_average.desc", 
        vote_count_gte=200,
        lang_config=lang_config
    )

@router.get("/trending", response_model=PaginatedContentRead)
async def get_trending_series(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    data = await tmdb_client.get_trending(media_type="series", page=page, lang_config=lang_config)
    return {
        "results": [transform_content(item, lang=lang_config["lang"]) for item in data["results"]],
        "page": data["page"],
        "total_pages": data["total_pages"],
        "total_results": data["total_results"]
    }

@router.get("/discover", response_model=PaginatedContentRead)
async def discover_series(
    page: int = 1,
    sort_by: str = "popularity.desc",
    with_genres: str | None = None,
    first_air_date_year: int | None = None,
    vote_average_gte: float | None = None,
    vote_average_lte: float | None = None,
    with_watch_providers: str | None = None,
    with_watch_monetization_types: str | None = None,
    watch_region: str | None = None,
    first_air_date_gte: str | None = None,
    first_air_date_lte: str | None = None,
    with_runtime_gte: int | None = None,
    with_runtime_lte: int | None = None,
    with_original_language: str | None = None,
    vote_count_gte: int | None = None,
    lang_config: dict = Depends(get_lang_config),
):
    """Gelişmiş filtreleme ile dizi keşfeder."""
    params = {"page": page, "sort_by": sort_by}
    if with_genres: params["with_genres"] = with_genres
    if first_air_date_year: params["first_air_date_year"] = first_air_date_year
    if vote_average_gte is not None: params["vote_average.gte"] = vote_average_gte
    if vote_average_lte is not None: params["vote_average.lte"] = vote_average_lte
    if with_watch_providers: params["with_watch_providers"] = with_watch_providers
    if with_watch_monetization_types: params["with_watch_monetization_types"] = with_watch_monetization_types
    if watch_region: params["watch_region"] = watch_region
    if first_air_date_gte: params["first_air_date.gte"] = first_air_date_gte
    if first_air_date_lte: params["first_air_date.lte"] = first_air_date_lte
    if with_runtime_gte is not None: params["with_runtime.gte"] = with_runtime_gte
    if with_runtime_lte is not None: params["with_runtime.lte"] = with_runtime_lte
    if with_original_language: params["with_original_language"] = with_original_language
    if vote_count_gte is not None: params["vote_count.gte"] = vote_count_gte

    data = await tmdb_client.discover_content("series", params, lang_config=lang_config)
    return {
        "results": [transform_content(item, lang=lang_config["lang"]) for item in data["results"]],
        "page": data["page"],
        "total_pages": data["total_pages"],
        "total_results": data["total_results"]
    }

@router.get("/recommendations", response_model=PaginatedContentRead)
async def get_personalized_series_recommendations(
    page: int = 1,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    lang_config: dict = Depends(get_lang_config)
):
    """Kullanıcıya özel dizi önerilerinin tamamını döner."""
    return await get_type_recommendations(user, "series", session, lang_config)

@router.get("/{item_id}", response_model=ContentDetailRead)
async def get_series(
    item_id: int, 
    lang_config: dict = Depends(get_lang_config),
    service: SeriesService = Depends(get_series_service)
):
    """Dizi detaylarını çeker."""
    return await service.get_details(item_id, lang_config)

@router.get("/{item_id}/cast", response_model=CastRead)
async def get_cast(
    item_id: int, 
    lang_config: dict = Depends(get_lang_config),
    service: SeriesService = Depends(get_series_service)
):
    """Dizi oyuncu ve ekip listesini döner."""
    details = await service.get_details(item_id, lang_config)
    return {"cast": details.get("cast", []), "crew": details.get("crew", [])}

@router.get("/{item_id}/recommendations", response_model=List[ContentReadBasic])
async def get_recommendations(item_id: int, lang_config: dict = Depends(get_lang_config)):
    try:
        data = await tmdb_client.get_recommendations("series", item_id, lang_config=lang_config)
    except Exception:
        return []
    return [transform_content(item, lang=lang_config["lang"]) for item in data["results"][:20]]

@router.get("/{item_id}/seasons/{season_number}", response_model=SeasonDetailRead)
async def get_season(
    item_id: int, 
    season_number: int, 
    lang_config: dict = Depends(get_lang_config),
    service: SeriesService = Depends(get_series_service)
):
    """Sezon detaylarını çeker."""
    return await service.get_season(item_id, season_number, lang_config)
