from .base import PersonReadBasic, ContentReadBasic

class PersonDetailRead(PersonReadBasic):
    biography: str | None = None
    birthday: str | None = None
    deathday: str | None = None
    place_of_birth: str | None = None
    also_known_as: list[str] = []
    known_for: list[ContentReadBasic] = []
    followers_count: int = 0
    is_following: bool = False
