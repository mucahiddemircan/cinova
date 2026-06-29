"""Takip sistemi endpointleri.

Kullanıcı ve kişi (oyuncu/yönetmen) takip etme/bırakma,
takipçi/takip edilen listeleri sorgulama işlemlerini yönetir.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.database import get_session
from app.dependencies import get_current_user, get_lang_config
from app.models import User, Follow
from app.api.endpoints.notifications import create_and_send_notification
from app.api.endpoints.recommendations import invalidate_user_cache

import asyncio
from app.services import tmdb_client
from app.utils.image_utils import build_image_url
from app.utils.content_converters import transform_person

router = APIRouter(prefix="/follows", tags=["follows"])

@router.get("/following/profiles")
async def get_followed_users(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Returns other users followed by the logged-in user."""
    query = await session.exec(
        select(User).join(Follow, Follow.followed_user_id == User.id)
        .where(Follow.follower_id == current_user.id)
    )
    followed_users = query.all()
    return [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in followed_users]

@router.get("/following/people")
async def get_followed_people(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    lang_config: dict = Depends(get_lang_config)
):
    """Returns TMDb people (actors, directors, etc.) followed by the logged-in user."""
    # Followed people
    followed_people_query = (await session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_person_id.is_not(None)
        )
    )).all()
    
    # Hidrasyon
    people_ids = [f.followed_person_id for f in followed_people_query]
    people_details = await tmdb_client.get_batch_people(people_ids, lang_config=lang_config)
    
    followed_people_data = []
    for f, detail in zip(followed_people_query, people_details):
        followed_people_data.append({
            "id": f.followed_person_id,
            "tmdb_id": f.followed_person_id,
            "name": detail.get("name") or "Unknown",
            "profile_path": build_image_url(detail.get("profile_path"))
        })
    
    return followed_people_data

@router.post("/profile/{username}")
async def follow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Follows a user."""
    if current_user.username == username:
        raise HTTPException(status_code=400, detail="Kendinizi takip edemezsiniz")
    
    query = await session.exec(select(User).where(User.username == username))
    target_user = query.one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Check if already followed
    follow_query = await session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_user_id == target_user.id
        )
    )
    if follow_query.one_or_none():
        return {"message": "Zaten takip ediliyor"}
    
    follow = Follow(follower_id=current_user.id, followed_user_id=target_user.id)
    session.add(follow)
    await session.commit()

    # Send notification
    await create_and_send_notification(
        session=session,
        user_id=target_user.id,
        actor_id=current_user.id,
        actor_username=current_user.username,
        notification_type="follow",
    )

    return {"message": "Takip edildi"}

@router.delete("/profile/{username}")
async def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Unfollows a user."""
    query = await session.exec(select(User).where(User.username == username))
    target_user = query.one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    follow_query = await session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_user_id == target_user.id
        )
    )
    follow = follow_query.one_or_none()
    if not follow:
        return {"message": "Takip edilmiyor"}
    
    await session.delete(follow)
    
    # Delete notification upon unfollowing
    from app.models import Notification
    from sqlmodel import delete
    delete_notification_stmt = delete(Notification).where(
        Notification.type == "follow",
        Notification.user_id == target_user.id,
        Notification.actor_id == current_user.id
    )
    await session.exec(delete_notification_stmt)
    
    await session.commit()
    return {"message": "Takibi bıraktınız"}

@router.post("/person/{person_id}")
async def follow_person(
    person_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Follows a person (actor/director)."""
    # Check if already followed
    follow_query = await session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_person_id == person_id
        )
    )
    if follow_query.one_or_none():
        return {"message": "Zaten takip ediliyor"}
    
    follow = Follow(
        follower_id=current_user.id, 
        followed_person_id=person_id
    )
    session.add(follow)
    await session.commit()
    invalidate_user_cache(current_user.id)
    return {"message": "Takip edildi"}

@router.delete("/person/{person_id}")
async def unfollow_person(
    person_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Unfollows a person."""
    follow_query = await session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_person_id == person_id
        )
    )
    follow = follow_query.one_or_none()
    if not follow:
        return {"message": "Takip edilmiyor"}
    
    await session.delete(follow)
    await session.commit()
    invalidate_user_cache(current_user.id)
    return {"message": "Takibi bıraktınız"}

@router.get("/profile/{username}/stats")
async def get_user_follow_stats(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    """Returns follow counts (followers and following) of the user."""
    query = await session.exec(select(User).where(User.username == username))
    user = query.one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    followers_count = (await session.exec(
        select(func.count()).where(Follow.followed_user_id == user.id)
    )).first()
    following_count = (await session.exec(
        select(func.count()).where(Follow.follower_id == user.id)
    )).first()
    
    return {
        "followers_count": followers_count,
        "following_count": following_count
    }

@router.get("/person/{person_id}/stats")
async def get_person_follow_stats(
    person_id: int,
    session: AsyncSession = Depends(get_session)
):
    """Returns followers count of a person."""
    followers_count = (await session.exec(
        select(func.count()).where(Follow.followed_person_id == person_id)
    )).first()
    return {"followers_count": followers_count}

@router.get("/profile/{username}/followers")
async def get_user_followers(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    """Returns followers of a specific user."""
    query = await session.exec(select(User).where(User.username == username))
    user = query.one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    follower_query = await session.exec(
        select(User).join(Follow, Follow.follower_id == User.id)
        .where(Follow.followed_user_id == user.id)
    )
    followers = follower_query.all()
    return [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in followers]

@router.get("/profile/{username}/following")
async def get_user_following(
    username: str,
    session: AsyncSession = Depends(get_session),
    lang_config: dict = Depends(get_lang_config)
):
    """Returns users and people followed by a specific user."""
    query = await session.exec(select(User).where(User.username == username))
    user = query.one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Followed users
    followed_users_query = await session.exec(
        select(User).join(Follow, Follow.followed_user_id == User.id)
        .where(Follow.follower_id == user.id)
    )
    followed_users = followed_users_query.all()
    
    # Followed people
    followed_people_query = (await session.exec(
        select(Follow).where(
            Follow.follower_id == user.id,
            Follow.followed_person_id.is_not(None)
        )
    )).all()

    # Hidrasyon
    people_ids = [f.followed_person_id for f in followed_people_query]
    people_details = await tmdb_client.get_batch_people(people_ids, lang_config=lang_config)

    people = []
    for f, detail in zip(followed_people_query, people_details):
        people.append({
            "id": f.followed_person_id,
            "tmdb_id": f.followed_person_id,
            "name": detail.get("name") or "Unknown",
            "profile_path": build_image_url(detail.get("profile_path"))
        })
    
    return {
        "users": [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in followed_users],
        "people": people
    }
