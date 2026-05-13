import re
from app.services.metadata import metadata_service

def is_latin(text: str | None) -> bool:
    """Metnin Latin alfabesi (ve Türkçe karakterler) içerip içermediğini kontrol eder.
    
    Eğer metin boşsa veya büyük oranda Çince, Japonca, Kiril gibi alfabeler içeriyorsa False döner.
    """
    if not text:
        return False
    # Latin, Sayılar, Noktalama ve Türkçe karakterler dışındakileri temizle
    # \u0000-\u017F aralığı: Temel Latin, Sayılar, Noktalama ve Türkçe karakterlerin tamamını kapsar.
    # Bu aralık dışındaki karakterleri temizleyip kalan var mı diye bakıyoruz.
    non_latin = re.sub(r'[\u0000-\u017F]', '', text)
    return len(non_latin) < len(text) * 0.2


def translate_department(dept: str | None, lang: str = "tr") -> str:
    """TMDB departman adını çevirir."""
    if not dept:
        return metadata_service.translate("roles", "Artist", lang)
    return metadata_service.translate("departments", dept, lang)


def translate_job(job: str | None, lang: str = "tr") -> str:
    """TMDB görev (job) adını çevirir."""
    if not job:
        return metadata_service.translate("roles", "Crew", lang)
    return metadata_service.translate("roles", job, lang)


def translate_language(code: str | None, lang: str = "tr") -> str:
    """Dil kodunu (en, tr) etiketine çevirir."""
    if not code:
        return "Unknown" if lang[:2].lower() == "en" else "Bilinmiyor"
    return metadata_service.translate("languages", code.lower(), lang)


def translate_status(status: str | None, lang: str = "tr") -> str:
    """TMDB içerik durumunu çevirir."""
    if not status:
        return "Unknown" if lang[:2].lower() == "en" else "Bilinmiyor"
    return metadata_service.translate("status", status, lang)


def translate_role_name(role: str | None, lang: str = "tr") -> str | None:
    """Karakter/Rol ismindeki teknik terimleri çevirir."""
    if not role:
        return role
    
    l_code = lang[:2].lower()
    if l_code == "en":
        return role
        
    role = role.replace("(voice)", "(ses)")
    return role


def resolve_title(item: dict, lang: str = "tr") -> tuple[str, str | None]:
    """İçerik başlığını dil hiyerarşisine göre çözümler."""
    localized = item.get("title") or item.get("name")
    fallback_title = item.get("_fallback_title")
    original = item.get("original_title") or item.get("original_name")
    
    l_code = lang[:2].lower()

    # Önceliklendirme Mantığı:
    # 1. Eğer localized veri Latin değilse ve fallback Latin ise -> fallback kullan
    # 2. Eğer mod EN ise -> localized (zaten EN) veya original
    # 3. Eğer mod TR ise -> localized (TR) veya fallback (EN)
    
    if l_code == "en":
        display = localized or fallback_title or original or "Untitled"
    else:
        is_turkish_content = item.get("original_language") == "tr"
        
        # Eğer TR veri Latin değilse ama EN (fallback) Latin ise, EN'yi kullan
        if not is_latin(localized) and is_latin(fallback_title):
            display = fallback_title
        # Eğer TR veri orijinal veriye eşitse (ve Türk yapımı değilse), fallback (EN) tercih et
        elif localized == original and not is_turkish_content and fallback_title:
            display = fallback_title
        else:
            display = localized or fallback_title or original or "İsimsiz"

    shown_original = original if original and original != display else None
    return display, shown_original


def resolve_person_name(item: dict, lang: str = "tr") -> tuple[str, str | None]:
    """Kişi ismini dil hiyerarşisine göre çözümler."""
    name = item.get("name")
    fallback_name = item.get("_fallback_name")
    original_name = item.get("original_name") or item.get("_fallback_original_name")
    
    l_code = lang[:2].lower()

    if l_code == "en":
        # Eğer birincil isim Latin değilse ama elimizde Latin bir fallback (TR'den gelmiş olabilir) varsa bile
        # İngilizce modunda her zaman en Latin olanı tercih etmeliyiz.
        display = name if is_latin(name) else (fallback_name or name or original_name or "Unnamed")
    else:
        # Türkçe modunda: İsim Latin değilse İngilizce (fallback) isme kaç
        if not is_latin(name) and is_latin(fallback_name):
            display = fallback_name
        else:
            display = name or fallback_name or original_name or "İsimsiz"

    # Orijinal ismi ne zaman göstermeliyiz?
    # 1. Orijinal isim mevcutsa ve ekrandaki isimden (display) farklıysa.
    # 2. VEYA ekrandaki isim orijinal isimden farklı bir yerelleştirilmiş isimse (name).
    
    shown_original = None
    if original_name and original_name != display and not is_latin(original_name):
        shown_original = original_name
    elif name and name != display and not is_latin(name):
        shown_original = name

    return display, shown_original
