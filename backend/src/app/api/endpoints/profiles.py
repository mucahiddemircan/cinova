"""Kullanıcı profili endpointleri.

Herkese açık profil sayfası, takip istatistikleri ve
içerik listelerini görüntüleme işlemlerini yönetir.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.dependencies import get_optional_current_user
from app.models import User, LibraryItem, Follow

router = APIRouter(prefix="/profiles", tags=["profiles"])




@router.get("/{username}")
async def get_user_profile(
    username: str, 
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_current_user)
):
    """Kullanıcının herkese açık profil ve izleme listelerini döndürür."""
    query = await session.exec(select(User).where(User.username == username))
    user = query.one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    watchlist_query = await session.exec(
        select(LibraryItem).where(LibraryItem.user_id == user.id)
    )
    watchlist_items = watchlist_query.all()

    # Takip istatistikleri
    followers_count = (await session.exec(
        select(func.count()).where(Follow.followed_user_id == user.id)
    )).first() or 0
    following_count = (await session.exec(
        select(func.count()).where(Follow.follower_id == user.id)
    )).first() or 0

    # Takip durumu
    is_following = False
    if current_user:
        is_following_query = await session.exec(
            select(Follow).where(
                Follow.follower_id == current_user.id,
                Follow.followed_user_id == user.id
            )
        )
        is_following = is_following_query.one_or_none() is not None

    lists = {
        "watchlist": [],
        "watched": [],
        "liked": []
    }

    for item in watchlist_items:
        data = {
            "id": item.tmdb_id,
            "title": item.title,
            "type": item.media_type,
            "poster_path": item.poster_path,
            "rating": item.rating,
        }
        if item.is_watchlist:
            lists["watchlist"].append(data)
        if item.is_watched:
            lists["watched"].append(data)
        if item.is_liked:
            lists["liked"].append(data)

    return {
        "username": user.username, 
        "id": user.id, 
        "lists": lists,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following
    }
