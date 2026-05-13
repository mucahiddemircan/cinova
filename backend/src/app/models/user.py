from pydantic import BaseModel, field_validator
from sqlmodel import SQLModel, Field, Relationship
import re
from uuid import UUID
from typing import Optional

RESERVED_USERNAMES = {
    "login", "register", "movies", "series", "people", 
    "search", "settings", "about", "help", "terms", 
    "privacy", "contact"
}

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    supabase_id: UUID | None = Field(default=None, index=True, unique=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str | None = Field(default=None)
    birth_date: str | None = Field(default=None)
    token_version: int = Field(default=0)
    is_complete: bool = Field(default=False)
    email_verified: bool = Field(default=False)
    username_changed_at: str | None = Field(default=None)
    auth_provider: str = Field(default="email")
    avatar_url: str | None = Field(default=None)
    
    library_items: list["LibraryItem"] = Relationship(back_populates="user")
    comments: list["Comment"] = Relationship(back_populates="user")
    comment_interactions: list["CommentInteraction"] = Relationship(back_populates="user")
    notifications_received: list["Notification"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[Notification.user_id]"}
    )
    custom_lists: list["CustomList"] = Relationship(back_populates="user")

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    birth_date: str | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if value.lower() in RESERVED_USERNAMES:
            raise ValueError(f"'{value}' kullanıcı adı olarak kullanılamaz")
        if not re.match(r"^[a-zA-Z0-9_.]+$", value):
            raise ValueError("Kullanıcı adı sadece harf, rakam, alt çizgi ve nokta içerebilir")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Geçerli bir e-posta adresi giriniz")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        errors = []
        if len(value) < 8:
            errors.append("En az 8 karakter")
        if not any(c.isupper() for c in value):
            errors.append("En az 1 büyük harf")
        if not any(c.islower() for c in value):
            errors.append("En az 1 küçük harf")
        if not any(c.isdigit() for c in value):
            errors.append("En az 1 rakam")
        if errors:
            detail = "Şifreniz şu gereksinimleri karşılamalıdır:\n" + "\n".join(
                f"* {e}" for e in errors
            )
            raise ValueError(detail)
        return value

class UserCompleteProfile(BaseModel):
    username: str
    birth_date: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if value.lower() in RESERVED_USERNAMES:
            raise ValueError(f"'{value}' kullanıcı adı olarak kullanılamaz")
        if not re.match(r"^[a-zA-Z0-9_.]+$", value):
            raise ValueError("Kullanıcı adı sadece harf, rakam, alt çizgi ve nokta içerebilir")
        return value

class UserLogin(BaseModel):
    username: str
    password: str
    remember_me: bool = False


class SetPasswordRequest(BaseModel):
    """Google-only kullanıcılar için ilk şifre belirleme."""
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        errors = []
        if len(value) < 8:
            errors.append("En az 8 karakter")
        if not any(c.isupper() for c in value):
            errors.append("En az 1 büyük harf")
        if not any(c.islower() for c in value):
            errors.append("En az 1 küçük harf")
        if not any(c.isdigit() for c in value):
            errors.append("En az 1 rakam")
        if errors:
            detail = "Şifreniz şu gereksinimleri karşılamalıdır:\n" + "\n".join(
                f"* {e}" for e in errors
            )
            raise ValueError(detail)
        return value


class ChangePasswordRequest(BaseModel):
    """Mevcut şifresi olan kullanıcılar için şifre değiştirme."""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        errors = []
        if len(value) < 8:
            errors.append("En az 8 karakter")
        if not any(c.isupper() for c in value):
            errors.append("En az 1 büyük harf")
        if not any(c.islower() for c in value):
            errors.append("En az 1 küçük harf")
        if not any(c.isdigit() for c in value):
            errors.append("En az 1 rakam")
        if errors:
            detail = "Şifreniz şu gereksinimleri karşılamalıdır:\n" + "\n".join(
                f"* {e}" for e in errors
            )
            raise ValueError(detail)
        return value


class ChangeEmailRequest(BaseModel):
    """E-posta değiştirme isteği."""
    new_email: str
    current_password: Optional[str] = None
    new_password: Optional[str] = None # Google-only kullanıcılar için zorunlu kılınacak

    @field_validator("new_email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Geçerli bir e-posta adresi giriniz")
        return value

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        errors = []
        if len(value) < 8:
            errors.append("En az 8 karakter")
        if not any(c.isupper() for c in value):
            errors.append("En az 1 büyük harf")
        if not any(c.islower() for c in value):
            errors.append("En az 1 küçük harf")
        if not any(c.isdigit() for c in value):
            errors.append("En az 1 rakam")
        if errors:
            detail = "Şifreniz şu gereksinimleri karşılamalıdır:\n" + "\n".join(
                f"* {e}" for e in errors
            )
            raise ValueError(detail)
        return value


class ChangeUsernameRequest(BaseModel):
    """Kullanıcı adı değiştirme isteği."""
    new_username: str
    current_password: Optional[str] = None

    @field_validator("new_username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if len(value) < 3:
            raise ValueError("Kullanıcı adı en az 3 karakter olmalıdır")
        if value.lower() in RESERVED_USERNAMES:
            raise ValueError(f"'{value}' kullanıcı adı olarak kullanılamaz")
        if not re.match(r"^[a-zA-Z0-9_.]+$", value):
            raise ValueError("Kullanıcı adı sadece harf, rakam, alt çizgi ve nokta içerebilir")
        return value

class ChangeAvatarRequest(BaseModel):
    """Profil fotoğrafı URL güncelleme isteği."""
    avatar_url: str | None


class AccountStatusResponse(BaseModel):
    """Hesap durumu yanıtı."""
    has_password: bool
    has_google: bool
    auth_provider: str
    email_verified: bool
    username_changed_at: Optional[str] = None

from .library_item import LibraryItem
from .comment import Comment, CommentInteraction
from .notification import Notification
from .custom_list import CustomList
