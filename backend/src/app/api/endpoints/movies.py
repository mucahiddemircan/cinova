from typing import List, Any
from fastapi import APIRouter, Depends, Query
from app.dependencies import get_lang_config, get_movie_service
from app.models import (
    ContentReadBasic,
    ContentDetailRead,
    HomeData,
    CastRead,
    SearchGroupedRead,
    PaginatedContentRead,
)
from app.services.movie_service import MovieService
from app.utils.content_converters import transform_content
from app.services import tmdb_client
from app.api.endpoints.recommendations import get_type_recommendations
from app.core.database import get_session
from sqlmodel.ext.asyncio.session import AsyncSession
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/movies", tags=["movies"])

@router.get("/home-data", response_model=HomeData)
async def get_home_data(
    lang_config: dict = Depends(get_lang_config),
    service: MovieService = Depends(get_movie_service)
):
    """Ana sayfa için tüm verileri paralel olarak çeker."""
    return await service.get_home_data(lang_config)

@router.get("/search", response_model=SearchGroupedRead | List[ContentReadBasic])
async def search_movies(
    q: str = "", 
    type: str = "all", 
    lang_config: dict = Depends(get_lang_config),
    service: MovieService = Depends(get_movie_service)
):
    """TMDB ve yerel DB üzerinde gelişmiş arama yapar."""
    return await service.search_all(q, type, lang_config)

@router.get("/popular", response_model=PaginatedContentRead)
async def get_popular_movies(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    from datetime import datetime, timedelta
    future_date = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
    return await discover_movies(
        page=page, 
        sort_by="popularity.desc", 
        release_date_lte=future_date,
        lang_config=lang_config
    )

@router.get("/now-playing", response_model=PaginatedContentRead)
async def get_now_playing_movies(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    from datetime import datetime, timedelta
    now = datetime.now()
    past_date = (now - timedelta(days=45)).strftime("%Y-%m-%d")
    future_date = (now + timedelta(days=5)).strftime("%Y-%m-%d")
    return await discover_movies(
        page=page, 
        sort_by="popularity.desc", 
        with_release_type="2|3",
        release_date_gte=past_date,
        release_date_lte=future_date,
        lang_config=lang_config
    )

@router.get("/upcoming", response_model=PaginatedContentRead)
async def get_upcoming_movies(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    from datetime import datetime, timedelta
    now = datetime.now()
    start_date = (now + timedelta(days=5)).strftime("%Y-%m-%d")
    end_date = (now + timedelta(days=25)).strftime("%Y-%m-%d")
    return await discover_movies(
        page=page, 
        sort_by="popularity.desc", 
        with_release_type="2|3",
        release_date_gte=start_date,
        release_date_lte=end_date,
        lang_config=lang_config
    )

@router.get("/top-rated", response_model=PaginatedContentRead)
async def get_top_rated_movies(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    return await discover_movies(
        page=page, 
        sort_by="vote_average.desc", 
        vote_count_gte=300,
        lang_config=lang_config
    )

@router.get("/trending", response_model=PaginatedContentRead)
async def get_trending_movies(page: int = 1, lang_config: dict = Depends(get_lang_config)):
    data = await tmdb_client.get_trending(media_type="movie", page=page, lang_config=lang_config)
    return {
        "results": [transform_content(item, lang=lang_config["lang"]) for item in data["results"]],
        "page": data["page"],
        "total_pages": data["total_pages"],
        "total_results": data["total_results"]
    }

@router.get("/discover", response_model=PaginatedContentRead)
async def discover_movies(
    page: int = 1,
    sort_by: str = "popularity.desc",
    with_genres: str | None = None,
    primary_release_year: int | None = None,
    vote_average_gte: float | None = None,
    vote_average_lte: float | None = None,
    with_watch_providers: str | None = None,
    with_watch_monetization_types: str | None = None,
    watch_region: str | None = None,
    region: str | None = None,
    release_date_gte: str | None = None,
    release_date_lte: str | None = None,
    with_release_type: str | None = None,
    with_runtime_gte: int | None = None,
    with_runtime_lte: int | None = None,
    with_original_language: str | None = None,
    vote_count_gte: int | None = None,
    lang_config: dict = Depends(get_lang_config),
):
    """Gelişmiş filtreleme ile film keşfeder."""
    params = {"page": page, "sort_by": sort_by}
    if with_genres: params["with_genres"] = with_genres
    if primary_release_year: params["primary_release_year"] = primary_release_year
    if vote_average_gte is not None: params["vote_average.gte"] = vote_average_gte
    if vote_average_lte is not None: params["vote_average.lte"] = vote_average_lte
    if with_watch_providers: params["with_watch_providers"] = with_watch_providers
    if with_watch_monetization_types: params["with_watch_monetization_types"] = with_watch_monetization_types
    if watch_region: params["watch_region"] = watch_region
    if region: params["region"] = region
    if release_date_gte: params["release_date.gte"] = release_date_gte
    if release_date_lte: params["release_date.lte"] = release_date_lte
    if with_release_type: params["with_release_type"] = with_release_type
    if with_runtime_gte is not None: params["with_runtime.gte"] = with_runtime_gte
    if with_runtime_lte is not None: params["with_runtime.lte"] = with_runtime_lte
    if with_original_language: params["with_original_language"] = with_original_language
    if vote_count_gte is not None: params["vote_count.gte"] = vote_count_gte

    data = await tmdb_client.discover_content("movie", params, lang_config=lang_config)
    return {
        "results": [transform_content(item, lang=lang_config["lang"]) for item in data["results"]],
        "page": data["page"],
        "total_pages": data["total_pages"],
        "total_results": data["total_results"]
    }

@router.get("/recommendations", response_model=PaginatedContentRead)
async def get_personalized_movie_recommendations(
    page: int = 1,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    lang_config: dict = Depends(get_lang_config)
):
    """Kullanıcıya özel film önerilerinin tamamını döner."""
    return await get_type_recommendations(user, "movie", session, lang_config)

@router.get("/{item_id}", response_model=ContentDetailRead)
async def get_movie(
    item_id: int, 
    lang_config: dict = Depends(get_lang_config),
    service: MovieService = Depends(get_movie_service)
):
    """Film detaylarını çeker."""
    return await service.get_details(item_id, lang_config)

@router.get("/{item_id}/cast", response_model=CastRead)
async def get_cast(
    item_id: int, 
    lang_config: dict = Depends(get_lang_config),
    service: MovieService = Depends(get_movie_service)
):
    """Film oyuncu ve ekip listesini döner."""
    # Note: Using MovieService.get_details then extracting cast/crew or implementing a specific method.
    # For now, let's just use get_details and return relevant parts, or implement get_cast in service.
    # To keep it efficient, we might want a separate method in service.
    # But for now, let's reuse get_details or add get_cast to MovieService.
    details = await service.get_details(item_id, lang_config)
    return {"cast": details.get("cast", []), "crew": details.get("crew", [])}

@router.get("/{item_id}/recommendations", response_model=List[ContentReadBasic])
async def get_recommendations(item_id: int, lang_config: dict = Depends(get_lang_config)):
    try:
        data = await tmdb_client.get_recommendations("movie", item_id, lang_config=lang_config)
    except Exception:
        return []
    return [transform_content(item, lang=lang_config["lang"]) for item in data["results"][:20]]
