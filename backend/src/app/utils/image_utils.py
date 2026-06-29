from app.core.config import settings

def build_image_url(path: str | None, size: str = "w500") -> str | None:
    """Converts the image path to a full URL. If it's already a full URL, leaves it untouched."""
    if path and not path.startswith("http"):
        base = settings.TMDB_IMAGE_BASE_URL.replace("w500", size)
        return f"{base}{path}"
    return path
