"""Yorum sistemi endpointleri.

İçerik yorumları oluşturma, yanıtlama, güncelleme, silme ve
yorum etkileşimleri (beğeni/beğenmeme) işlemlerini yönetir.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_session
from app.dependencies import get_current_user, get_optional_current_user
from app.models import (
    Comment, CommentCreate, CommentRead, CommentUpdate, 
    CommentInteraction, User
)
from app.api.endpoints.notifications import create_and_send_notification

router = APIRouter(prefix="/comments", tags=["comments"])

@router.get("/{comment_id}/replies", response_model=List[CommentRead])
async def get_replies(
    comment_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Belirli bir yorumun yanıtlarını getirir."""
    likes_sub = (
        select(CommentInteraction.comment_id, func.count(CommentInteraction.id).label("count"))
        .where(CommentInteraction.interaction_type == "like")
        .group_by(CommentInteraction.comment_id)
        .subquery()
    )

    dislikes_sub = (
        select(CommentInteraction.comment_id, func.count(CommentInteraction.id).label("count"))
        .where(CommentInteraction.interaction_type == "dislike")
        .group_by(CommentInteraction.comment_id)
        .subquery()
    )

    replies_count_sub = (
        select(Comment.parent_id, func.count(Comment.id).label("count"))
        .where(Comment.parent_id != None)
        .group_by(Comment.parent_id)
        .subquery()
    )

    query = (
        select(
            Comment, 
            User.username,
            User.avatar_url,
            func.coalesce(likes_sub.c.count, 0).label("likes_count"),
            func.coalesce(dislikes_sub.c.count, 0).label("dislikes_count"),
            func.coalesce(replies_count_sub.c.count, 0).label("replies_count")
        )
        .join(User, Comment.user_id == User.id)
        .outerjoin(likes_sub, Comment.id == likes_sub.c.comment_id)
        .outerjoin(dislikes_sub, Comment.id == dislikes_sub.c.comment_id)
        .outerjoin(replies_count_sub, Comment.id == replies_count_sub.c.parent_id)
        .where(Comment.parent_id == comment_id)
        .order_by(Comment.created_at.asc())
    )

    results = await session.exec(query)
    
    replies_read = []
    for comment, username, avatar_url, likes_count, dislikes_count, replies_count in results:
        user_interaction = None
        if current_user:
            interaction_query = select(CommentInteraction.interaction_type).where(
                and_(
                    CommentInteraction.comment_id == comment.id,
                    CommentInteraction.user_id == current_user.id
                )
            )
            user_interaction_res = await session.exec(interaction_query)
            user_interaction = user_interaction_res.first()

        replies_read.append(CommentRead(
            id=comment.id,
            user_id=comment.user_id,
            username=username,
            avatar_url=avatar_url,
            tmdb_id=comment.tmdb_id,
            media_type=comment.media_type,
            content=comment.content,
            parent_id=comment.parent_id,
            created_at=comment.created_at,
            likes_count=likes_count,
            dislikes_count=dislikes_count,
            user_interaction=user_interaction,
            replies_count=replies_count,
            is_edited=comment.is_edited,
            is_spoiler=comment.is_spoiler

        ))
    
    return replies_read

@router.get("/{media_type}/{tmdb_id}", response_model=List[CommentRead])
async def get_comments(
    media_type: str,
    tmdb_id: int,
    sort: str = "newest",
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """İçeriğe ait üst seviye yorumları getirir."""
    replies_count_sub = (
        select(Comment.parent_id, func.count(Comment.id).label("count"))
        .where(Comment.parent_id != None)
        .group_by(Comment.parent_id)
        .subquery()
    )

    likes_sub = (
        select(CommentInteraction.comment_id, func.count(CommentInteraction.id).label("count"))
        .where(CommentInteraction.interaction_type == "like")
        .group_by(CommentInteraction.comment_id)
        .subquery()
    )

    dislikes_sub = (
        select(CommentInteraction.comment_id, func.count(CommentInteraction.id).label("count"))
        .where(CommentInteraction.interaction_type == "dislike")
        .group_by(CommentInteraction.comment_id)
        .subquery()
    )

    query = (
        select(
            Comment, 
            User.username,
            User.avatar_url,
            func.coalesce(replies_count_sub.c.count, 0).label("replies_count"),
            func.coalesce(likes_sub.c.count, 0).label("likes_count"),
            func.coalesce(dislikes_sub.c.count, 0).label("dislikes_count")
        )
        .join(User, Comment.user_id == User.id)
        .outerjoin(replies_count_sub, Comment.id == replies_count_sub.c.parent_id)
        .outerjoin(likes_sub, Comment.id == likes_sub.c.comment_id)
        .outerjoin(dislikes_sub, Comment.id == dislikes_sub.c.comment_id)
        .where(Comment.tmdb_id == tmdb_id)
        .where(Comment.media_type == media_type)
        .where(Comment.parent_id == None)
    )

    if sort == "top":
        query = query.order_by(func.coalesce(likes_sub.c.count, 0).desc())
    else:
        query = query.order_by(Comment.created_at.desc())

    results = await session.exec(query)
    
    comments_read = []
    for comment, username, avatar_url, replies_count, likes_count, dislikes_count in results:
        user_interaction = None
        if current_user:
            interaction_query = select(CommentInteraction.interaction_type).where(
                and_(
                    CommentInteraction.comment_id == comment.id,
                    CommentInteraction.user_id == current_user.id
                )
            )
            user_interaction_res = await session.exec(interaction_query)
            user_interaction = user_interaction_res.first()

        comments_read.append(CommentRead(
            id=comment.id,
            user_id=comment.user_id,
            username=username,
            avatar_url=avatar_url,
            tmdb_id=comment.tmdb_id,
            media_type=comment.media_type,
            content=comment.content,
            parent_id=comment.parent_id,
            created_at=comment.created_at,
            likes_count=likes_count,
            dislikes_count=dislikes_count,
            user_interaction=user_interaction,
            replies_count=replies_count,
            is_edited=comment.is_edited,
            is_spoiler=comment.is_spoiler

        ))
    
    return comments_read

@router.post("/", response_model=CommentRead)
async def create_comment(
    comment_input: CommentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Yeni yorum veya yanıt oluşturur."""
    db_comment = Comment(
        user_id=current_user.id,
        tmdb_id=comment_input.tmdb_id,
        media_type=comment_input.media_type,
        parent_id=comment_input.parent_id,
        content=comment_input.content,
        is_spoiler=comment_input.is_spoiler
    )
    session.add(db_comment)
    await session.commit()
    await session.refresh(db_comment)

    # Yanıt ise üst yorumun sahibine bildirim gönder
    if comment_input.parent_id:
        parent_comment = await session.get(Comment, comment_input.parent_id)
        if parent_comment and parent_comment.user_id != current_user.id:
            await create_and_send_notification(
                session=session,
                user_id=parent_comment.user_id,
                actor_id=current_user.id,
                actor_username=current_user.username,
                notification_type="comment_reply",
                comment_id=db_comment.id,
                tmdb_id=comment_input.tmdb_id,
                media_type=comment_input.media_type,
            )

    return CommentRead(
        id=db_comment.id,
        user_id=db_comment.user_id,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        tmdb_id=db_comment.tmdb_id,
        media_type=db_comment.media_type,
        content=db_comment.content,
        parent_id=db_comment.parent_id,
        created_at=db_comment.created_at,
        likes_count=0,
        dislikes_count=0,
        user_interaction=None,
        replies_count=0,
        is_spoiler=db_comment.is_spoiler
    )

@router.post("/{comment_id}/interact")
async def interact_with_comment(
    comment_id: int,
    interaction_type: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Yoruma beğeni/beğenmeme ekler veya mevcut etkileşimi kaldırır."""
    stmt = select(CommentInteraction).where(
        and_(
            CommentInteraction.comment_id == comment_id,
            CommentInteraction.user_id == current_user.id
        )
    )
    existing = await session.exec(stmt)
    existing_interaction = existing.first()

    if interaction_type == "clear" or (existing_interaction and existing_interaction.interaction_type == interaction_type):
        if existing_interaction:
            await session.delete(existing_interaction)
    else:
        if existing_interaction:
            existing_interaction.interaction_type = interaction_type
            session.add(existing_interaction)
        else:
            new_interaction = CommentInteraction(
                comment_id=comment_id,
                user_id=current_user.id,
                interaction_type=interaction_type
            )
            session.add(new_interaction)
    await session.commit()

    from app.models import Notification
    from sqlmodel import delete

    # Eğer etkileşim kaldırıldıysa veya dislike'a döndüyse, eski beğeni bildirimini sil
    if interaction_type == "clear" or interaction_type == "dislike" or (existing_interaction and existing_interaction.interaction_type == interaction_type):
        delete_notification_stmt = delete(Notification).where(
            and_(
                Notification.type == "comment_like",
                Notification.actor_id == current_user.id,
                Notification.comment_id == comment_id
            )
        )
        await session.exec(delete_notification_stmt)
        await session.commit()

    # Beğeni bildirimi gönder (sadece "like" ve başka bir kullanıcının yorumu ise)
    if interaction_type == "like":
        comment = await session.get(Comment, comment_id)
        if comment and comment.user_id != current_user.id:
            await create_and_send_notification(
                session=session,
                user_id=comment.user_id,
                actor_id=current_user.id,
                actor_username=current_user.username,
                notification_type="comment_like",
                comment_id=comment_id,
                tmdb_id=comment.tmdb_id,
                media_type=comment.media_type,
            )

    return {"status": "success"}

@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Yorumu siler (sadece sahibine açık)."""
    db_comment = await session.get(Comment, comment_id)
    if not db_comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    if db_comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece kendi yorumunuzu silebilirsiniz")
    
    from app.models import Notification, CommentInteraction
    from sqlmodel import delete
    
    from sqlalchemy import text
    
    # Tüm alt yorumların (recursive) ID'lerini bulmak için CTE kullanıyoruz
    # Bu, PostgreSQL/Supabase üzerinde derin iç içe geçmiş yorumların tamamını kapsar.
    tree_query = text("""
        WITH RECURSIVE comment_tree AS (
            SELECT id FROM comment WHERE id = :cid
            UNION ALL
            SELECT c.id FROM comment c
            JOIN comment_tree ct ON c.parent_id = ct.id
        )
        SELECT id FROM comment_tree
    """)
    tree_res = await session.execute(tree_query, {"cid": comment_id})
    all_comment_ids = [row[0] for row in tree_res.all()]
    
    # Bildirimleri sil
    await session.exec(
        delete(Notification).where(Notification.comment_id.in_(all_comment_ids))
    )
    
    # Etkileşimleri (beğeni/beğenmeme) sil
    await session.exec(
        delete(CommentInteraction).where(CommentInteraction.comment_id.in_(all_comment_ids))
    )
    
    await session.delete(db_comment)
    await session.commit()
    return {"status": "success"}

@router.patch("/{comment_id}")
async def update_comment(
    comment_id: int,
    comment_update: CommentUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Yorumu düzenler (sadece sahibine açık)."""
    db_comment = await session.get(Comment, comment_id)
    if not db_comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    if db_comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece kendi yorumunuzu düzenleyebilirsiniz")
    
    if comment_update.content is not None:
        from app.core.datetime_utils import utc_now
        db_comment.content = comment_update.content
        db_comment.updated_at = utc_now()
        db_comment.is_edited = True
    
    if comment_update.is_spoiler is not None:
        db_comment.is_spoiler = comment_update.is_spoiler
    
    session.add(db_comment)
    await session.commit()
    return {"status": "success", "content": db_comment.content}
