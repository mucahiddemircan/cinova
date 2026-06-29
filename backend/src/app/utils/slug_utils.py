import re
import unicodedata

def generate_slug(text: str) -> str:
    """
    Converts text into a URL-friendly slug.
    Provides Turkish character support.
    """
    # Turkish character conversion
    tr_map = {
        'ş': 's', 'Ş': 's',
        'ı': 'i', 'İ': 'i',
        'ğ': 'g', 'Ğ': 'g',
        'ü': 'u', 'Ü': 'u',
        'ö': 'o', 'Ö': 'o',
        'ç': 'c', 'Ç': 'c'
    }
    for tr_char, en_char in tr_map.items():
        text = text.replace(tr_char, en_char)
    
    text = text.lower()
    
    # Unicode normalization (for other special characters)
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    
    # Replace non-alphanumeric characters with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    
    text = text.strip('-')
    
    return text

