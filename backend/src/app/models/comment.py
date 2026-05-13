from datetime import datetime
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from app.core.datetime_utils import utc_now

class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    tmdb_id: int = Field(index=True)
    media_type: str = Field(index=True) # "movie" or "series"
    parent_id: int | None = Field(default=None, foreign_key="comment.id", index=True)
    content: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    is_edited: bool = Field(default=False)
    is_spoiler: bool = Field(default=False)

    user: "User" = Relationship(back_populates="comments")
    parent: Optional["Comment"] = Relationship(
        back_populates="replies",
        sa_relationship_kwargs={"remote_side": "Comment.id"}
    )
    replies: List["Comment"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    interactions: List["CommentInteraction"] = Relationship(back_populates="comment", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    notifications: List["Notification"] = Relationship(
        back_populates="comment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class CommentInteraction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    comment_id: int = Field(foreign_key="comment.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    interaction_type: str = Field(index=True) # "like" or "dislike"
    created_at: datetime = Field(default_factory=utc_now)

    comment: "Comment" = Relationship(back_populates="interactions")
    user: "User" = Relationship(back_populates="comment_interactions")

# Schemas
class CommentCreate(BaseModel):
    tmdb_id: int
    media_type: str
    content: str
    parent_id: Optional[int] = None
    is_spoiler: bool = False


class CommentUpdate(BaseModel):
    content: str
    is_spoiler: Optional[bool] = None

class CommentRead(BaseModel):
    id: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    tmdb_id: int
    media_type: str
    content: str
    parent_id: Optional[int] = None
    created_at: datetime
    likes_count: int = 0
    dislikes_count: int = 0
    user_interaction: Optional[str] = None # "like", "dislike" or None
    replies_count: int = 0
    is_edited: bool = False
    is_spoiler: bool = False

from .user import User
from .notification import Notification
