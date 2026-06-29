import re
from app.services.metadata import metadata_service

def is_latin(text: str | None) -> bool:
    """Checks if text contains Latin characters (including Turkish characters).
    
    Returns False if text is empty or contains mostly Chinese, Japanese, Cyrillic etc. alphabets.
    """
    if not text:
        return False
    # Clean characters outside Latin, numbers, punctuation, and Turkish characters
    # Range \u0000-\u017F covers all Basic Latin, numbers, punctuation, and Turkish characters.
    # We clean characters outside this range and check if any remain.
    non_latin = re.sub(r'[\u0000-\u017F]', '', text)
    return len(non_latin) < len(text) * 0.2


def translate_department(dept: str | None, lang: str = "tr") -> str:
    """Translates TMDB department name."""
    if not dept:
        return metadata_service.translate("roles", "Artist", lang)
    return metadata_service.translate("departments", dept, lang)


def translate_job(job: str | None, lang: str = "tr") -> str:
    """Translates TMDB job name."""
    if not job:
        return metadata_service.translate("roles", "Crew", lang)
    return metadata_service.translate("roles", job, lang)


def translate_language(code: str | None, lang: str = "tr") -> str:
    """Translates language code (en, tr) to its label."""
    if not code:
        return "Unknown" if lang[:2].lower() == "en" else "Bilinmiyor"
    return metadata_service.translate("languages", code.lower(), lang)


def translate_status(status: str | None, lang: str = "tr") -> str:
    """Translates TMDB content status."""
    if not status:
        return "Unknown" if lang[:2].lower() == "en" else "Bilinmiyor"
    return metadata_service.translate("status", status, lang)


def translate_role_name(role: str | None, lang: str = "tr") -> str | None:
    """Translates technical terms in character/role names."""
    if not role:
        return role
    
    l_code = lang[:2].lower()
    if l_code == "en":
        return role
        
    role = role.replace("(voice)", "(ses)")
    return role


def resolve_title(item: dict, lang: str = "tr") -> tuple[str, str | None]:
    """Resolves the content title based on language hierarchy."""
    localized = item.get("title") or item.get("name")
    fallback_title = item.get("_fallback_title")
    original = item.get("original_title") or item.get("original_name")
    
    l_code = lang[:2].lower()

    # Prioritization Logic:
    # 1. If localized data is non-Latin and fallback is Latin -> use fallback
    # 2. If mode is EN -> localized (already EN) or original
    # 3. If mode is TR -> localized (TR) or fallback (EN)
    
    if l_code == "en":
        display = localized or fallback_title or original or "Untitled"
    else:
        is_turkish_content = item.get("original_language") == "tr"
        
        # If TR data is non-Latin but EN (fallback) is Latin, use EN
        if not is_latin(localized) and is_latin(fallback_title):
            display = fallback_title
        # If TR data equals original data (and is not Turkish-made), prefer fallback (EN)
        elif localized == original and not is_turkish_content and fallback_title:
            display = fallback_title
        else:
            display = localized or fallback_title or original or "İsimsiz"

    shown_original = original if original and original != display else None
    return display, shown_original


def resolve_person_name(item: dict, lang: str = "tr") -> tuple[str, str | None]:
    """Resolves the person's name based on language hierarchy."""
    name = item.get("name")
    fallback_name = item.get("_fallback_name")
    original_name = item.get("original_name") or item.get("_fallback_original_name")
    
    l_code = lang[:2].lower()

    if l_code == "en":
        # Even if the primary name is non-Latin, if we have a Latin fallback (might come from TR),
        # we should always prefer the most Latin one in English mode.
        display = name if is_latin(name) else (fallback_name or name or original_name or "Unnamed")
    else:
        # In Turkish mode: if the name is non-Latin, fall back to the English name
        if not is_latin(name) and is_latin(fallback_name):
            display = fallback_name
        else:
            display = name or fallback_name or original_name or "İsimsiz"

    # When should we show the original name?
    # 1. If original name exists and is different from the display name.
    # 2. OR if the display name is a localized name different from the original name.
    
    shown_original = None
    if original_name and original_name != display and not is_latin(original_name):
        shown_original = original_name
    elif name and name != display and not is_latin(name):
        shown_original = name

    return display, shown_original
