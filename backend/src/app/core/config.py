from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings. Values are read from the .env file."""

    SECRET_KEY: str = "gizli-anahtar-degistirin"
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/dbname"
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-anon-key"
    SUPABASE_JWT_SECRET: str = "your-jwt-secret"
    SUPABASE_JWKS_URL: str = "your-jwks-url"
    SUPABASE_SERVICE_ROLE_KEY: str = "your-service-role-key"
    TMDB_API_KEY: str = "your_api_key"
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_IMAGE_BASE_URL: str = "https://image.tmdb.org/t/p/w500"
    GOOGLE_API_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
