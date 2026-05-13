"""Kullanıcı profilleri ve izleme listesi endpointleri.

Sistemdeki kullanıcıları listeleme, başkalarının veya giriş yapan kullanıcının
profiline ve izleme listelerine erişme işlemlerini yönetir.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Optional

from app.core.database import get_session
from app.dependencies import get_current_user, get_optional_current_user
from app.models import User, LibraryItem, Follow, UserCompleteProfile
from app.api.endpoints.recommendations import invalidate_user_cache

router = APIRouter(tags=["users"])

# --- Giriş Yapan Kullanıcı (Me) ---

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Oturum açmış kullanıcının bilgilerini, takip istatistiklerini ve liste özetini döndürür."""
    # Takip istatistikleri
    followers_count = (await session.exec(
        select(func.count()).where(Follow.followed_user_id == current_user.id)
    )).first() or 0
    following_count = (await session.exec(
        select(func.count()).where(Follow.follower_id == current_user.id)
    )).first() or 0

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_complete": current_user.is_complete,
        "has_password": current_user.hashed_password is not None or current_user.auth_provider in ("email", "hybrid"),
        "has_google": current_user.supabase_id is not None and current_user.auth_provider in ("google", "hybrid"),
        "auth_provider": current_user.auth_provider,
        "email_verified": current_user.email_verified,
        "avatar_url": current_user.avatar_url,
    }


@router.post("/me/complete-profile")
async def complete_profile(
    payload: UserCompleteProfile,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Eksik profil bilgilerini (kullanıcı adı ve doğum tarihi) tamamlar."""
    # Kullanıcı adı zaten alınmış mı kontrol et (kendisi değilse)
    if payload.username != current_user.username:
        username_query = await session.exec(select(User).where(User.username == payload.username))
        if username_query.first():
            raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış.")
    
    current_user.username = payload.username
    current_user.birth_date = payload.birth_date
    current_user.is_complete = True
    
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    return current_user


# --- Başka Kullanıcıların Profili ve Listeleri ---

@router.get("/profiles/{username}")
async def get_user_profile(
    username: str, 
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_current_user)
):
    """Kullanıcının herkese açık profilini döndürür."""
    query = await session.exec(select(User).where(User.username == username))
    user = query.one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    # Get stats for the profile summary
    followers_count = (await session.exec(
        select(func.count()).where(Follow.followed_user_id == user.id)
    )).first() or 0
    following_count = (await session.exec(
        select(func.count()).where(Follow.follower_id == user.id)
    )).first() or 0

    is_following = False
    if current_user:
        is_following_query = await session.exec(
            select(Follow).where(
                Follow.follower_id == current_user.id,
                Follow.followed_user_id == user.id
            )
        )
        is_following = is_following_query.one_or_none() is not None

    # Get a summary of counts for the profile page
    watchlist_count = (await session.exec(
        select(func.count()).where(LibraryItem.user_id == user.id, LibraryItem.is_watchlist == True)
    )).first() or 0
    watched_count = (await session.exec(
        select(func.count()).where(LibraryItem.user_id == user.id, LibraryItem.is_watched == True)
    )).first() or 0
    likes_count = (await session.exec(
        select(func.count()).where(LibraryItem.user_id == user.id, LibraryItem.is_liked == True)
    )).first() or 0

    return {
        "username": user.username, 
        "id": user.id, 
        "avatar_url": user.avatar_url,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following,
        "stats": {
            "watchlist": watchlist_count,
            "watched": watched_count,
            "likes": likes_count
        }
    }
