from pydantic import BaseModel

class ContentReadBasic(BaseModel):
    id: int
    title: str
    original_title: str | None = None
    tagline: str | None = None
    description: str | None = None
    type: str
    nav_type: str | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    release_date: str | None = None
    vote_average: float | None = None
    popularity: float | None = None
    role: str | None = None
    genre_ids: list[int] = []
    trailer_key: str | None = None
    certification: str | None = None

class PersonReadBasic(BaseModel):
    id: int
    name: str
    original_name: str | None = None
    profile_path: str | None = None
    known_for_department: str | None = None
    department: str | None = None
    popularity: float | None = None
