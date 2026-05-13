from app.core.config import settings

def build_image_url(path: str | None, size: str = "w500") -> str | None:
    """Görsel yolunu tam URL'ye çevirir. Zaten tam URL ise dokunmaz."""
    if path and not path.startswith("http"):
        base = settings.TMDB_IMAGE_BASE_URL.replace("w500", size)
        return f"{base}{path}"
    return path
