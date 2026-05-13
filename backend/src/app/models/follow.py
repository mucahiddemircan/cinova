from sqlmodel import SQLModel, Field
from typing import Optional

class Follow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    follower_id: int = Field(foreign_key="user.id")
    followed_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    followed_person_id: Optional[int] = Field(default=None) # TMDB ID
