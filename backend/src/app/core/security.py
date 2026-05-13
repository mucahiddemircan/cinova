import logging
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 hafta

# JWKS Client initialization
jwks_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Düz metin şifreyi veritabanındaki hash ile karşılaştırır."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    """Şifreyi bcrypt ile hashler."""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """JWT erişim token'ı oluşturur."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Token'ı çözer. Geçersiz veya süresi dolmuşsa None döner."""
    try:
        # Önce Supabase'in yeni (ECC/ES256) anahtarlarını JWKS üzerinden deneyelim
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["HS256", "ES256"],
            options={"verify_aud": False}
        )
    except Exception:
        # Eğer JWKS'te bulunamazsa (eski HS256 tokenları için), legacy secret'ı deneyelim
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        except jwt.ExpiredSignatureError:
            logger.warning("Token süresi dolmuş")
            return None
        except jwt.PyJWTError as e:
            logger.warning("Geçersiz token: %s", e)
            return None