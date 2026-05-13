"""Kullanıcı adı ve e-posta uygunluk kontrolleri.

Gerçek kayıt ve giriş işlemleri Supabase Auth tarafından yönetilir.
Bu endpoint'ler sadece frontend tarafında form doğrulaması için kullanılır.
"""

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/check-username")
async def check_username_availability(
    username: str,
    session: AsyncSession = Depends(get_session),
):
    """Kullanıcı adının uygunluğunu kontrol eder."""
    from app.models.user import RESERVED_USERNAMES
    
    if username.lower() in RESERVED_USERNAMES:
        return {"available": False, "message": "Bu kullanıcı adı rezerve edilmiştir."}
        
    result = await session.exec(select(User).where(User.username == username))
    return {"available": result.first() is None}


@router.get("/check-email")
async def check_email_availability(
    email: str,
    session: AsyncSession = Depends(get_session),
):
    """E-postanın uygunluğunu kontrol eder."""
    result = await session.exec(select(User).where(User.email == email))
    return {"available": result.first() is None}
