from fastapi import APIRouter
from app.services import tmdb_client

router = APIRouter(prefix="/certifications", tags=["certifications"])

# Simple in-memory cache
_cert_cache: dict[str, int] = {}

@router.get("")
async def get_certifications():
    """Aggregates certifications worldwide and returns as {name: order}."""
    global _cert_cache
    if _cert_cache:
        return _cert_cache

    try:
        data = await tmdb_client.get_all_certifications()
        mapping = {}

        # Merge all countries for movies and series
        for category in ["movie", "series"]:
            countries = data.get(category, {})
            for country_code, certs in countries.items():
                if not certs:
                    continue
                
                # Find the highest order value in this country (for normalization)
                max_order = max((c.get("order", 1) for c in certs), default=1)
                
                for cert in certs:
                    name = cert.get("certification")
                    order = cert.get("order", 0)
                    if name:
                        # Severity score: value between 0.0 and 1.0
                        severity = order / max_order if max_order > 0 else 0
                        
                        # If name conflicts, keep the highest severity score
                        if name not in mapping or severity > mapping[name]:
                            mapping[name] = severity

        _cert_cache = mapping
        return _cert_cache
    except Exception as e:
        return {"error": str(e)}
