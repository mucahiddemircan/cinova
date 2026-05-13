from datetime import datetime
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from app.core.datetime_utils import utc_now

class Interaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    tmdb_id: int
    media_type: str = "movie"
    title: str
    poster_path: str | None = None
    vote_average: float | None = None
    release_date: str | None = None
    description: str | None = None
    interaction_type: str = Field(index=True) # "like" or "dislike"
    genre_ids: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    
    user: "User" = Relationship(back_populates="interactions")

class InteractionCreate(BaseModel):
    tmdb_id: int
    media_type: str
    title: str
    poster_path: str | None = None
    vote_average: float | None = None
    release_date: str | None = None
    description: str | None = None
    interaction_type: str
    genre_ids: list[int] | None = None

from .user import User
