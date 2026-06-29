from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.models import User
from app.core.security import decode_access_token

import logging

from app.services import tmdb_client
from app.services.notification_service import NotificationService
from app.services.library_service import LibraryService
from app.services.movie_service import MovieService
from app.services.series_service import SeriesService

logger = logging.getLogger(__name__)

async def get_notification_service(session: AsyncSession = Depends(get_session)) -> NotificationService:
    return NotificationService(session)

async def get_library_service(session: AsyncSession = Depends(get_session)) -> LibraryService:
    return LibraryService(session)

async def get_movie_service(session: AsyncSession = Depends(get_session)) -> MovieService:
    return MovieService(session)

async def get_series_service(session: AsyncSession = Depends(get_session)) -> SeriesService:
    return SeriesService(session)

def get_lang_config(request: Request) -> dict:
    """Returns the TMDB language configuration from the Accept-Language header."""
    return tmdb_client.get_language_config(request.headers.get("Accept-Language"))

security = HTTPBearer()

async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """
    Header'daki Bearer token'dan aktif kullanıcıyı döndürür.
    
    JIT Provisioning (Yönerge 1) ve Güvenli Hesap Birleştirme (Yönerge 2):
    1. supabase_id ile kullanıcı ara → Varsa oturum açtır
    2. email ile kullanıcı ara:
       a. Bulundu + email_verified=True → Hesap birleştir
       b. Bulundu + email_verified=False → Doğrulanmamış hesabı ez
       c. Bulunamadı → Yeni kullanıcı oluştur (is_complete=False)
    """
    token = auth.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş oturum")

    supabase_id_str: str | None = payload.get("sub")
    if not supabase_id_str:
        raise HTTPException(status_code=401, detail="Token geçersiz")

    from uuid import UUID
    try:
        supabase_id = UUID(supabase_id_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Geçersiz Supabase ID formatı")

    # Convert email to lowercase to prevent conflicts
    email_raw = payload.get("email")
    email = email_raw.lower() if email_raw else None
    
    # --- Email Verification Status Detection (Extended) ---
    email_confirmed_at = payload.get("email_confirmed_at")
    app_metadata = payload.get("app_metadata", {})
    
    # 1. Root level email_verified
    # 2. email_verified in app_metadata
    # 3. email_verified in user_metadata
    # 4. Presence of email_confirmed_at field
    user_metadata = payload.get("user_metadata", {})
    jwt_email_verified = (
        bool(payload.get("email_verified")) or 
        bool(app_metadata.get("email_verified")) or 
        bool(user_metadata.get("email_verified")) or 
        (email_confirmed_at is not None)
    )
    
    # Detect users coming via Google OAuth
    provider = app_metadata.get("provider", "email")
    is_google_login = provider == "google"
    
    # For Google sign-ins, email is automatically considered verified
    if is_google_login:
        jwt_email_verified = True

    # Get the metadata information sent during registration
    username_from_meta = user_metadata.get("username")
    birth_date_from_meta = user_metadata.get("birth_date")

    # --- Step 1: Find user by supabase_id ---
    query = await session.exec(select(User).where(User.supabase_id == supabase_id))
    user = query.one_or_none()

    if user:
        needs_update = False
        
        # --- Email and Provider Synchronization ---
        # Latest email coming from JWT
        jwt_email = payload.get("email")
        if jwt_email and user.email != jwt_email.lower():
            logger.info("E-posta değişikliği algılandı: %s -> %s", user.email, jwt_email.lower())
            user.email = jwt_email.lower()
            
            # Directive 3: If Google/Hybrid user changes email, the Google connection is unlinked
            needs_update = True

        # email_verified durumunu senkronize et
        if user.email_verified != jwt_email_verified:
            user.email_verified = jwt_email_verified
            needs_update = True
            
        # Synchronize auth_provider (for Email -> Hybrid conversion)
        # This logic only runs if the email has not changed
        providers = app_metadata.get("providers", [])
        if "google" in providers and user.auth_provider == "email":
            user.auth_provider = "hybrid"
            needs_update = True
        elif is_google_login and user.auth_provider == "google":
            # Already Google, but let's make sure
            pass
            
        # Complete profile if missing and new data is present in the token
        if not user.is_complete:
            if username_from_meta:
                user.username = username_from_meta
            if birth_date_from_meta:
                user.birth_date = birth_date_from_meta
            
            # Set is_complete=True only if both username and birth_date are present
            if user.username and user.birth_date:
                user.is_complete = True
            needs_update = True

        if needs_update:
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
        return user

    # --- Step 2: Find user by email ---
    if email:
        email_query = await session.exec(select(User).where(func.lower(User.email) == email.lower()))
        existing_user = email_query.one_or_none()

        if existing_user:
            # Does token say verified or is it already verified in the database?
            if existing_user.email_verified or is_google_login or jwt_email_verified:
                # --- Step 2a: Email verified → Secure account merging ---
                existing_user.supabase_id = supabase_id
                existing_user.email_verified = True # Setting to TRUE since either token or DB confirms verification
                
                if is_google_login:
                    if existing_user.hashed_password:
                        existing_user.auth_provider = "hybrid"
                    else:
                        existing_user.auth_provider = "google"
                
                # Metadata bilgilerini aktar
                if username_from_meta:
                    existing_user.username = username_from_meta
                if birth_date_from_meta:
                    existing_user.birth_date = birth_date_from_meta
                
                # Completion check
                if existing_user.username and existing_user.birth_date:
                    existing_user.is_complete = True
                else:
                    existing_user.is_complete = False

                session.add(existing_user)
                await session.commit()
                await session.refresh(existing_user)
                logger.info("Hesap birleştirildi (Email üzerinden): user_id=%s, provider=%s", existing_user.id, existing_user.auth_provider)
                return existing_user
            else:
                # --- Step 2b: Email not verified → Overwrite and recreate account ---
                logger.warning(
                    "Doğrulanmamış hesap eziliyor: email=%s, eski_user_id=%s",
                    email, existing_user.id
                )
                await session.delete(existing_user)
                await session.commit()

    # --- Step 3: Create new user (JIT Provisioning) ---
    if email:
        import random
        import string

        # Profile completion status check
        is_complete = False
        if username_from_meta and birth_date_from_meta:
            username = username_from_meta
            is_complete = True
        elif username_from_meta:
            username = username_from_meta
            is_complete = False
        else:
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            username = f"user_{random_suffix}"
            is_complete = False

        user = User(
            supabase_id=supabase_id,
            email=email.lower(),
            username=username,
            is_complete=is_complete,
            hashed_password=None,
            birth_date=birth_date_from_meta,
            email_verified=jwt_email_verified,
            auth_provider="google" if is_google_login else "email",
        )
        session.add(user)
        try:
            await session.commit()
            await session.refresh(user)
            logger.info("Yeni kullanıcı oluşturuldu (JIT): email=%s, username=%s, is_complete=%s, provider=%s", 
                        email, username, is_complete, user.auth_provider)
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturulamadı: {str(e)}")

    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı veritabanında bulunamadı")

    return user

async def get_optional_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    """Returns the user if token exists, otherwise returns None."""
    if not auth:
        return None

    token = auth.credentials
    payload = decode_access_token(token)
    if not payload:
        return None

    supabase_id_str: str | None = payload.get("sub")
    if not supabase_id_str:
        return None

    from uuid import UUID
    try:
        supabase_id = UUID(supabase_id_str)
    except ValueError:
        return None

    query = await session.exec(select(User).where(User.supabase_id == supabase_id))
    return query.one_or_none()


from fastapi import Query

async def get_current_user_sse(
    token: str = Query(None),
    auth: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Dependency that accepts token via both Header and Query Parameter for SSE."""
    actual_token = token or (auth.credentials if auth else None)
    
    if not actual_token:
        raise HTTPException(status_code=401, detail="Kimlik doğrulaması gerekli")
        
    payload = decode_access_token(actual_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş oturum")

    supabase_id_str: str | None = payload.get("sub")
    if not supabase_id_str:
        raise HTTPException(status_code=401, detail="Token geçersiz")

    from uuid import UUID
    try:
        supabase_id = UUID(supabase_id_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Geçersiz Supabase ID formatı")

    query = await session.exec(select(User).where(User.supabase_id == supabase_id))
    user = query.one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

    return user
