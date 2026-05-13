from datetime import datetime
from typing import Any
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from app.core.datetime_utils import utc_now

class LibraryItem(SQLModel, table=True):
    __tablename__ = "library_item"
    
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    tmdb_id: int = Field(index=True)
    media_type: str = Field(index=True) # "movie" or "series"
    
    # Cached TMDB Data
    vote_average: float | None = None
    release_date: str | None = None
    genre_ids: str | None = None
    
    # States
    is_watchlist: bool = Field(default=False, index=True)
    is_watched: bool = Field(default=False, index=True)
    is_liked: bool = Field(default=False, index=True)
    is_disliked: bool = Field(default=False, index=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    
    user: "User" = Relationship(back_populates="library_items")

class LibraryItemCreate(BaseModel):
    tmdb_id: int
    media_type: str
    vote_average: float | None = None
    release_date: str | None = None
    genre_ids: Any | None = None
    action: str # "watchlist", "watched", "like", "dislike"
    value: bool

class LibraryItemRead(BaseModel):
    id: int
    user_id: int
    tmdb_id: int
    media_type: str
    title: str | None = None
    poster_path: str | None = None
    vote_average: float | None = None
    release_date: str | None = None
    genre_ids: str | None = None
    is_watchlist: bool
    is_watched: bool
    is_liked: bool
    is_disliked: bool
    created_at: datetime
    updated_at: datetime

from .user import User
