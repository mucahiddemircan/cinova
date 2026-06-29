import logging
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# JWKS Client initialization
jwks_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares plain text password with database hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    """Hashes password with bcrypt."""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Creates JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decodes token. Returns None if invalid or expired."""
    errors = []
    try:
        # First, try Supabase's new (ECC/ES256) keys via JWKS
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["HS256", "ES256"],
            options={"verify_aud": False}
        )
    except Exception as e_jwks:
        errors.append(f"JWKS error: {type(e_jwks).__name__} - {e_jwks}")
        # If not found in JWKS (for legacy HS256 tokens), try legacy secret
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        except jwt.ExpiredSignatureError as e_exp:
            errors.append(f"Legacy Expired: {e_exp}")
            logger.warning("Token süresi dolmuş")
        except jwt.PyJWTError as e_jwt:
            errors.append(f"Legacy JWTError: {e_jwt}")
            logger.warning("Geçersiz token: %s", e_jwt)
        except Exception as e_other:
            errors.append(f"Legacy OtherError: {e_other}")
            
    # Log diagnostics if token decoding failed
    logger.warning("Token decoding failed. Diagnostics: %s", ", ".join(errors))
        
    return None