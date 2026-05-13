from datetime import datetime
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from app.core.datetime_utils import utc_now

class WatchList(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    tmdb_id: int
    media_type: str = "movie"
    title: str
    poster_path: str | None = None
    rating: float | None = None
    vote_average: float | None = None
    release_date: str | None = None
    description: str | None = None
    status: str | None = None
    genre_ids: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    user: "User" = Relationship(back_populates="watchlist_items")

class WatchListCreate(BaseModel):
    tmdb_id: int
    media_type: str
    title: str
    poster_path: str | None = None
    rating: float | None = None
    vote_average: float | None = None
    release_date: str | None = None
    description: str | None = None
    status: str | None = None
    genre_ids: list[int] | None = None

from .user import User
