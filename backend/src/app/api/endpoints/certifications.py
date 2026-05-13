from fastapi import APIRouter
from app.services import tmdb_client

router = APIRouter(prefix="/certifications", tags=["certifications"])

# Basit bellek içi önbellek
_cert_cache: dict[str, int] = {}

@router.get("")
async def get_certifications():
    """Tüm dünyadaki sertifikaları birleştirir ve {isim: order} olarak döner."""
    global _cert_cache
    if _cert_cache:
        return _cert_cache

    try:
        data = await tmdb_client.get_all_certifications()
        mapping = {}

        # Filmler ve diziler için tüm ülkeleri birleştir
        for category in ["movie", "series"]:
            countries = data.get(category, {})
            for country_code, certs in countries.items():
                if not certs:
                    continue
                
                # Bu ülkedeki en yüksek order değerini bul (normalizasyon için)
                max_order = max((c.get("order", 1) for c in certs), default=1)
                
                for cert in certs:
                    name = cert.get("certification")
                    order = cert.get("order", 0)
                    if name:
                        # Şiddet puanı: 0.0 ile 1.0 arasında bir değer
                        severity = order / max_order if max_order > 0 else 0
                        
                        # Eğer isim çakışırsa en yüksek şiddet puanını tut
                        if name not in mapping or severity > mapping[name]:
                            mapping[name] = severity

        _cert_cache = mapping
        return _cert_cache
    except Exception as e:
        return {"error": str(e)}
