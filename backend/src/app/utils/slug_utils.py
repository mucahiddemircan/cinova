import re
import unicodedata

def generate_slug(text: str) -> str:
    """
    Metni URL dostu bir slug haline getirir.
    Türkçe karakter desteği sağlar.
    """
    # Türkçe karakter dönüşümü
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
    
    # Küçük harfe çevir
    text = text.lower()
    
    # Unicode normalizasyonu (diğer özel karakterler için)
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    
    # Alfanümerik olmayanları tire ile değiştir
    text = re.sub(r'[^a-z0-9]+', '-', text)
    
    # Baş ve sondaki tireleri temizle
    text = text.strip('-')
    
    return text
