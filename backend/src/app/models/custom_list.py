from datetime import datetime
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from app.core.datetime_utils import utc_now
from typing import List, Optional

class CustomList(SQLModel, table=True):
    __tablename__ = "custom_list"
    
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str = Field(max_length=100)
    slug: str = Field(index=True, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    is_private: bool = Field(default=False)
    media_type: str = Field(default="movie") # "movie" or "series"
    created_at: datetime = Field(default_factory=utc_now)
    
    user: "User" = Relationship(back_populates="custom_lists")
    items: List["CustomListItem"] = Relationship(back_populates="custom_list", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class CustomListItem(SQLModel, table=True):
    __tablename__ = "custom_list_item"
    
    id: int | None = Field(default=None, primary_key=True)
    list_id: int = Field(foreign_key="custom_list.id", index=True)
    tmdb_id: int
    created_at: datetime = Field(default_factory=utc_now)
    
    custom_list: CustomList = Relationship(back_populates="items")

# Pydantic models for API
class CustomListItemCreate(BaseModel):
    tmdb_id: int

class CustomListCreate(BaseModel):
    title: str
    description: str | None = None
    is_private: bool = False
    media_type: str
    items: List[CustomListItemCreate] = []

class CustomListItemRead(BaseModel):
    id: int
    tmdb_id: int
    title: str | None = None
    poster_path: str | None = None
    created_at: datetime

class CustomListRead(BaseModel):
    id: int
    user_id: int
    title: str
    slug: str
    description: str | None
    is_private: bool
    media_type: str
    created_at: datetime
    items: List[CustomListItemRead] = []

from .user import User
