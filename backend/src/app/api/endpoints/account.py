"""Account management endpoints.

Şifre oluşturma/değiştirme, e-posta değiştirme, kullanıcı adı değiştirme
ve Google bağlantısı yönetimi işlemlerini içerir.

Yönerge 3: Hibrit Hesap Yönetimi
Yönerge 4: Sosyal Bağlantı Koparma Güvenliği
Yönerge 6: Dinamik Profil ve Hesap Ayarları
"""

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.core.security import verify_password, get_password_hash
from app.dependencies import get_current_user
from app.models import (
    User,
    SetPasswordRequest,
    ChangePasswordRequest,
    ChangeEmailRequest,
    ChangeUsernameRequest,
    AccountStatusResponse,
    ChangeAvatarRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["account"])

# Username change interval (days)
USERNAME_CHANGE_COOLDOWN_DAYS = 30


@router.get("/status", response_model=AccountStatusResponse)
async def get_account_status(
    current_user: User = Depends(get_current_user),
):
    """
    Kullanıcının hesap durumunu döndürür.
    Frontend, bu bilgiye göre Settings sayfasını dinamik olarak şekillendirir.
    """
    has_google = (
        current_user.supabase_id is not None
        and current_user.auth_provider in ("google", "hybrid")
    )
    
    # If provider is email or hybrid, it definitely has a password (even if on Supabase side)
    has_password = (current_user.hashed_password is not None) or (current_user.auth_provider in ("email", "hybrid"))
    
    return AccountStatusResponse(
        has_password=has_password,
        has_google=has_google,
        auth_provider=current_user.auth_provider,
        email_verified=current_user.email_verified,
        username_changed_at=current_user.username_changed_at,
    )


async def verify_supabase_password(email: str, password: str) -> bool:
    """
    Veritabanımızda hash'i olmayan klasik kullanıcılar için 
    Supabase Auth API üzerinden şifre doğrulaması yapar.
    """
    import requests
    from app.core.config import settings
    
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "password": password,
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code == 200:
            logger.info("Supabase şifre doğrulaması başarılı: email=%s", email)
            return True
        else:
            logger.warning(
                "Supabase şifre doğrulaması başarısız: email=%s, status=%s, body=%s",
                email, response.status_code, response.text
            )
            return False
    except Exception as e:
        logger.error("Supabase şifre doğrulama hatası (istek sırasında): %s", e)
        return False


async def update_supabase_auth_password(access_token: str, new_password: str):
    """
    Supabase Auth API üzerinden kullanıcının şifresini günceller.
    Bu sayede Login sayfasında yeni şifre geçerli olur.
    """
    import requests
    from app.core.config import settings
    
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = {"password": new_password}
    
    try:
        response = requests.put(url, headers=headers, json=data, timeout=10)
        if response.status_code != 200:
            logger.error("Supabase Auth şifre güncelleme hatası: %s", response.text)
            raise HTTPException(
                status_code=response.status_code,
                detail="Supabase Auth şifre güncellemesi başarısız oldu."
            )
        logger.info("Supabase Auth şifresi başarıyla güncellendi.")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.error("Supabase Auth isteği sırasında hata: %s", e)
        raise HTTPException(status_code=500, detail="Şifre senkronizasyonu sırasında hata oluştu.")



# --- Directive 6A: Dynamic Password Management ---


@router.post("/set-password")
async def set_password(
    payload: SetPasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Google-only kullanıcılar için ilk şifre belirleme.
    hashed_password = None ise çalışır, aksi halde 400 döner.
    Şifre belirlendikten sonra hesap 'hybrid' duruma geçer.
    """
    if current_user.hashed_password is not None:
        raise HTTPException(
            status_code=400,
            detail="Zaten bir şifreniz var. Şifreyi değiştirmek için 'Şifreni Değiştir' seçeneğini kullanın.",
        )

    # First update in Supabase (Sync)
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Oturum doğrulanamadı.")
    token = auth_header.split(" ")[1]
    await update_supabase_auth_password(token, payload.new_password)

    current_user.hashed_password = get_password_hash(payload.new_password)

    # Account transitions to hybrid status
    if current_user.auth_provider == "google":
        current_user.auth_provider = "hybrid"

    session.add(current_user)
    await session.commit()

    logger.info("Şifre oluşturuldu: user_id=%s, yeni provider=%s", current_user.id, current_user.auth_provider)
    return {"message": "Şifreniz başarıyla oluşturuldu."}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Mevcut şifresi olan kullanıcılar için şifre değiştirme.
    Güvenlik gereği mevcut şifrenin doğrulanması zorunludur.
    """
    # Verification logic
    is_valid = False
    if current_user.hashed_password is not None:
        is_valid = verify_password(payload.current_password, current_user.hashed_password)
    else:
        # If no hash, verify via Supabase and synchronize
        is_valid = await verify_supabase_password(current_user.email, payload.current_password)
        if is_valid:
            # Do not set password immediately as it will be changed by new_password below anyway
            # But we confirmed its validity.
            pass

    if not is_valid:
        logger.warning("Şifre değiştirme başarısız: Mevcut şifre hatalı. user_id=%s", current_user.id)
        raise HTTPException(status_code=400, detail="Mevcut şifreniz hatalı.")

    # New password cannot be the same as the old password
    if verify_password(payload.new_password, current_user.hashed_password) if current_user.hashed_password else payload.current_password == payload.new_password:
        logger.warning("Şifre değiştirme başarısız: Yeni şifre eskiyle aynı. user_id=%s", current_user.id)
        raise HTTPException(
            status_code=400,
            detail="Yeni şifreniz mevcut şifreniz ile aynı olamaz."
        )

    # First update in Supabase (Sync)
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Oturum doğrulanamadı.")
    token = auth_header.split(" ")[1]
    await update_supabase_auth_password(token, payload.new_password)

    current_user.hashed_password = get_password_hash(payload.new_password)
    session.add(current_user)
    await session.commit()

    logger.info("Şifre değiştirildi: user_id=%s", current_user.id)
    return {"message": "Şifreniz başarıyla değiştirildi."}


# --- Directive 6B: Secure Email Change ---


@router.post("/change-email")
async def change_email(
    payload: ChangeEmailRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    E-posta değiştirme isteği.
    
    Best Practice: DB'deki email hemen değiştirilmez.
    Supabase, yeni adrese doğrulama linki gönderir.
    Doğrulama tamamlanınca Supabase tarafında güncellenir,
    bir sonraki token yenilemesinde backend de günceller.
    
    has_password olan kullanıcılardan mevcut şifre sorulur.
    """
    # Password verification or new password setting
    if (current_user.hashed_password is not None) or (current_user.auth_provider in ("email", "hybrid")):
        # Users who have or should have an existing password
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="Güvenlik için mevcut şifrenizi girmelisiniz.",
            )
            
        # Verification logic
        is_valid = False
        if current_user.hashed_password is not None:
            is_valid = verify_password(payload.current_password, current_user.hashed_password)
        else:
            # If no hash, verify via Supabase and synchronize
            is_valid = await verify_supabase_password(current_user.email, payload.current_password)
            if is_valid:
                current_user.hashed_password = get_password_hash(payload.current_password)
                session.add(current_user)
                await session.commit()
                logger.info("Şifre hash'i senkronize edildi (E-posta değişimi sırasında): user_id=%s", current_user.id)

        if not is_valid:
            raise HTTPException(status_code=400, detail="Mevcut şifreniz hatalı.")
            
        # If setting initial password (Google-only), send to Supabase as well
        if not current_user.hashed_password and payload.new_password:
            auth_header = request.headers.get("Authorization")
            if auth_header:
                token = auth_header.split(" ")[1]
                await update_supabase_auth_password(token, payload.new_password)

        if not current_user.hashed_password and payload.new_password:
            current_user.hashed_password = get_password_hash(payload.new_password)
            # Hybrid now since password is added
            if current_user.auth_provider == "google":
                current_user.auth_provider = "hybrid"
            
            session.add(current_user)
            await session.commit()

    # Is the new email used by another account?
    existing = await session.exec(
        select(User).where(User.email == payload.new_email)
    )
    if existing.one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Bu e-posta adresi zaten kullanımda.",
        )

    # Email update request on Supabase side will be done from frontend.
    # Backend only handles authorization and checking.
    logger.info(
        "E-posta değişikliği istendi: user_id=%s, yeni_email=%s",
        current_user.id, payload.new_email,
    )
    return {
        "message": "E-posta değişikliğini onaylamak için lütfen yeni e-posta adresinize gönderilen bağlantıya tıklayın.",
        "approved": True,
    }


# --- Directive 6C: Username Change ---


@router.post("/change-username")
async def change_username(
    payload: ChangeUsernameRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Kullanıcı adı değiştirme (30 gün sınırı ile).
    has_password olan kullanıcılardan mevcut şifre sorulur.
    """
    # Password verification (if has_password)
    if (current_user.hashed_password is not None) or (current_user.auth_provider in ("email", "hybrid")):
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="Güvenlik için mevcut şifrenizi girmelisiniz.",
            )
            
        # Verification logic
        is_valid = False
        if current_user.hashed_password is not None:
            is_valid = verify_password(payload.current_password, current_user.hashed_password)
        else:
            # If no hash, verify via Supabase and synchronize
            is_valid = await verify_supabase_password(current_user.email, payload.current_password)
            if is_valid:
                current_user.hashed_password = get_password_hash(payload.current_password)
                session.add(current_user)
                await session.commit()
                logger.info("Şifre hash'i senkronize edildi (Kullanıcı adı değişimi sırasında): user_id=%s", current_user.id)

        if not is_valid:
            raise HTTPException(status_code=400, detail="Mevcut şifreniz hatalı.")

    # 30-day limit check
    if current_user.username_changed_at:
        last_change = datetime.fromisoformat(current_user.username_changed_at)
        cooldown_end = last_change + timedelta(days=USERNAME_CHANGE_COOLDOWN_DAYS)
        now = datetime.now(timezone.utc)
        if now < cooldown_end:
            remaining_days = (cooldown_end - now).days + 1
            raise HTTPException(
                status_code=429,
                detail=f"Kullanıcı adınızı {remaining_days} gün sonra değiştirebilirsiniz.",
            )

    # Uniqueness check
    if payload.new_username != current_user.username:
        existing = await session.exec(
            select(User).where(User.username == payload.new_username)
        )
        if existing.one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Bu kullanıcı adı zaten kullanımda.",
            )

    current_user.username = payload.new_username
    current_user.username_changed_at = datetime.now(timezone.utc).isoformat()
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    logger.info("Kullanıcı adı değiştirildi: user_id=%s, yeni=%s", current_user.id, payload.new_username)
    return {
        "message": "Kullanıcı adınız başarıyla değiştirildi.",
        "username": current_user.username,
    }


@router.patch("/avatar")
async def update_avatar(
    payload: ChangeAvatarRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Kullanıcının profil fotoğrafı URL'sini günceller.
    """
    current_user.avatar_url = payload.avatar_url
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    logger.info("Profil fotoğrafı güncellendi: user_id=%s, url=%s", current_user.id, payload.avatar_url)
    return {
        "message": "Profil fotoğrafı başarıyla güncellendi.",
        "avatar_url": current_user.avatar_url,
    }


