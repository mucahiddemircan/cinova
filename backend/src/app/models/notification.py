"""Bildirim modeli.

Kullanıcı bildirimlerini (takip, yorum yanıtı, yorum beğenisi) saklar.
"""

from datetime import datetime
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from app.core.datetime_utils import utc_now


class Notification(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)       # Bildirimi alan kullanıcı
    actor_id: int = Field(foreign_key="user.id")                   # Aksiyonu yapan kullanıcı
    type: str = Field(index=True)                                   # "follow" | "comment_reply" | "comment_like"
    comment_id: int | None = Field(default=None, foreign_key="comment.id")
    tmdb_id: int | None = Field(default=None)
    media_type: str | None = Field(default=None)                    # "movie" | "series"
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)

    # Relationships
    user: "User" = Relationship(
        back_populates="notifications_received",
        sa_relationship_kwargs={"foreign_keys": "[Notification.user_id]"}
    )
    actor: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Notification.actor_id]"}
    )
    comment: Optional["Comment"] = Relationship(back_populates="notifications")


class NotificationRead(BaseModel):
    id: int
    type: str
    actor_username: str
    actor_initial: str
    actor_avatar_url: str | None = None
    comment_id: int | None = None
    tmdb_id: int | None = None
    media_type: str | None = None
    message: str
    is_read: bool
    created_at: datetime


from .user import User
from .comment import Comment
