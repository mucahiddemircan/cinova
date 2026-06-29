from fastapi import APIRouter, Header
from app.services.metadata import metadata_service

router = APIRouter()

@router.get("/config")
async def get_metadata_config(accept_language: str = Header("tr-TR")):
    """
    Frontend için gerekli tüm dinamik metadata (türler, ülkeler vb.) ve 
    sabit çevirileri döner.
    """
    lang = accept_language.split(",")[0] if accept_language else "tr-TR"
    
    movie_genres = await metadata_service.get_genres("movie", lang)
    series_genres = await metadata_service.get_genres("series", lang)
    countries = await metadata_service.get_countries(lang)
    
    # Also add local translations (for frontend department/role translations)
    l_code = lang[:2].lower()
    local = metadata_service.translations.get(l_code, metadata_service.translations.get("tr", {}))
    
    languages = await metadata_service.get_languages()
    
    return {
        "genres": {
            "movie": movie_genres,
            "series": series_genres
        },
        "countries": countries,
        "languages": languages,
        "local": local
    }

@router.get("/providers")
async def get_watch_providers(
    region: str = "TR", 
    type: str = "movie",
    accept_language: str = Header("tr-TR")
):
    """
    Belirli bir bölgedeki aktif yayın servislerini (Netflix, vb.) döner.
    """
    lang = accept_language.split(",")[0] if accept_language else "tr-TR"
    return await metadata_service.get_watch_providers(type, region, lang)
