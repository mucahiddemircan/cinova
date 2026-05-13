from pydantic import BaseModel
from .base import ContentReadBasic, PersonReadBasic

class SeasonRead(BaseModel):
    id: int
    name: str
    season_number: int
    episode_count: int
    air_date: str | None = None
    poster_path: str | None = None
    overview: str | None = None

class EpisodeRead(BaseModel):
    id: int
    name: str
    episode_number: int
    overview: str | None = None
    air_date: str | None = None
    runtime: int | None = None
    still_path: str | None = None
    vote_average: float | None = None

class SeasonDetailRead(SeasonRead):
    episodes: list[EpisodeRead] = []

class WatchProviderInfo(BaseModel):
    provider_id: int
    provider_name: str
    logo_path: str | None = None
    display_priority: int | None = None

class WatchProvidersRegion(BaseModel):
    link: str | None = None
    flatrate: list[WatchProviderInfo] = []
    ads: list[WatchProviderInfo] = []
    free: list[WatchProviderInfo] = []
    rent: list[WatchProviderInfo] = []
    buy: list[WatchProviderInfo] = []

class ContentDetailRead(ContentReadBasic):
    genres: list[str] = []
    cast: list[PersonReadBasic] = []
    crew: list[PersonReadBasic] = []
    runtime: int | None = None
    production_companies: list[str] = []
    status: str | None = None
    original_language: str | None = None
    number_of_seasons: int | None = None
    seasons: list[SeasonRead] = []
    watch_providers: dict[str, WatchProvidersRegion] = {}

class PaginatedContentRead(BaseModel):
    results: list[ContentReadBasic]
    page: int
    total_pages: int
    total_results: int

class PaginatedPersonRead(BaseModel):
    results: list[PersonReadBasic]
    page: int
    total_pages: int
    total_results: int

class HomeData(BaseModel):
    movies: list[ContentReadBasic]
    series: list[ContentReadBasic]
    people: list[PersonReadBasic]

class CastRead(BaseModel):
    cast: list[PersonReadBasic]
    crew: list[PersonReadBasic]

class SearchGroupedRead(BaseModel):
    relevant: list[ContentReadBasic] = []
    movies: list[ContentReadBasic] = []
    series: list[ContentReadBasic] = []
    people: list[PersonReadBasic] = []
    profiles: list[PersonReadBasic] = []


class PersonalizedRecommendationsRead(BaseModel):
    followed_works_movies: list[ContentReadBasic] = []
    followed_works_series: list[ContentReadBasic] = []
    genre_recommendations_movies: list[ContentReadBasic] = []
    genre_recommendations_series: list[ContentReadBasic] = []
    list_recommendations_movies: list[ContentReadBasic] = []
    list_recommendations_series: list[ContentReadBasic] = []
