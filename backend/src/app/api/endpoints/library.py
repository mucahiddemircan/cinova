from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from app.dependencies import get_current_user, get_optional_current_user, get_library_service, get_lang_config
from app.models import User, LibraryItem, LibraryItemCreate, LibraryItemRead
from app.services.library_service import LibraryService

router = APIRouter(prefix="/library", tags=["library"])

@router.post("/", response_model=dict)
async def toggle_library_action(
    payload: LibraryItemCreate,
    current_user: User = Depends(get_current_user),
    service: LibraryService = Depends(get_library_service)
):
    """
    Standard library action: watchlist, watched, like, dislike.
    Enforces mutual exclusivity between watchlist and watched.
    """
    return await service.toggle_action(current_user.id, payload)

@router.get("/summary/{username}", response_model=dict)
async def get_user_library_summary(
    username: str,
    current_user: User | None = Depends(get_optional_current_user),
    service: LibraryService = Depends(get_library_service),
    lang_config: dict = Depends(get_lang_config)
):
    """Kullanıcının kütüphane özetini (sayılar ve posterler) döner."""
    return await service.get_summary(username, current_user, lang_config=lang_config)

@router.get("/me/summary", response_model=dict)
@router.get("/summary-me", include_in_schema=False) # Backwards compatibility
async def get_my_full_summary(
    current_user: User = Depends(get_current_user),
    service: LibraryService = Depends(get_library_service),
    lang_config: dict = Depends(get_lang_config)
):
    """Giriş yapmış kullanıcının tüm kütüphane verilerini (status_map, stats, follows) döner."""
    return await service.get_full_me_summary(current_user, lang_config=lang_config)

@router.get("/status/{media_type}/{tmdb_id}", response_model=dict)
async def get_content_library_status(
    media_type: str,
    tmdb_id: int,
    current_user: User = Depends(get_current_user),
    service: LibraryService = Depends(get_library_service)
):
    """Bir içeriğin kullanıcının kütüphanesindeki durumunu (bayraklarını) döner."""
    return await service.get_content_status(current_user.id, media_type, tmdb_id)

@router.get("/{username}/{action}", response_model=List[LibraryItemRead])
@router.get("/list/{username}/{action}", include_in_schema=False) # Backwards compatibility
async def get_user_library_list(
    username: str,
    action: str,
    media_type: Optional[str] = Query(None),
    current_user: User | None = Depends(get_optional_current_user),
    service: LibraryService = Depends(get_library_service),
    lang_config: dict = Depends(get_lang_config)
):
    """Kullanıcının kütüphane listesini (örn: watched movies) döner."""
    return await service.get_library_list(username, action, media_type, current_user, lang_config=lang_config)
