from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from sqlalchemy.orm import selectinload

from app.core.database import get_session
from app.models.user import User
from app.models.custom_list import (
    CustomList, CustomListItem, 
    CustomListCreate, CustomListRead,
    CustomListItemCreate
)
from app.dependencies import get_current_user, get_optional_current_user, get_lang_config
from app.utils.slug_utils import generate_slug
from app.services import tmdb_client
from app.utils.image_utils import build_image_url

router = APIRouter(prefix="/custom-lists", tags=["custom-lists"])

@router.post("/", response_model=CustomListRead)
async def create_custom_list(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    list_in: CustomListCreate
):
    """Yeni bir özel liste oluşturur."""
    base_slug = generate_slug(list_in.title)
    slug = base_slug
    counter = 1
    
    # Benzersiz slug kontrolü (aynı kullanıcı için)
    while True:
        query = select(CustomList).where(
            CustomList.user_id == current_user.id,
            CustomList.slug == slug
        )
        result = await session.exec(query)
        if not result.first():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    db_list = CustomList(
        user_id=current_user.id,
        title=list_in.title,
        slug=slug,
        description=list_in.description,
        is_private=list_in.is_private,
        media_type=list_in.media_type
    )
    session.add(db_list)
    await session.flush() # ID almak için
    
    # Öğeleri ekle
    for item_in in list_in.items:
        db_item = CustomListItem(
            list_id=db_list.id,
            tmdb_id=item_in.tmdb_id
        )
        session.add(db_item)
    
    await session.commit()
    
    # Eager load items for response
    query = select(CustomList).where(CustomList.id == db_list.id).options(selectinload(CustomList.items))
    result = await session.exec(query)
    return result.one()

@router.get("/", response_model=List[CustomListRead])
async def list_custom_lists(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Kullanıcının özel listelerini getirir."""
    query = select(CustomList).where(CustomList.user_id == current_user.id).options(selectinload(CustomList.items))
    result = await session.exec(query)
    return result.all()

@router.get("/user/{username}")
async def get_user_custom_lists(
    username: str,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_current_user),
    lang_config: dict = Depends(get_lang_config)
):
    """Belirli bir kullanıcının özel listelerini (özet formatında) getirir."""
    user_query = await session.exec(select(User).where(User.username == username))
    user = user_query.one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    is_owner = current_user and current_user.id == user.id
    
    query = select(CustomList).where(CustomList.user_id == user.id)
    if not is_owner:
        query = query.where(CustomList.is_private == False)
    
    query = query.order_by(CustomList.created_at.desc())
    result = await session.exec(query)
    custom_lists = result.all()
    
    data = []
    for l in custom_lists:
        # Son 5 öğenin tmdb_id'lerini al
        items_query = await session.exec(
            select(CustomListItem.tmdb_id)
            .where(CustomListItem.list_id == l.id)
            .order_by(CustomListItem.created_at.desc())
            .limit(5)
        )
        item_ids = items_query.all()
        
        # Hidrasyon için TMDB'den detayları çek (sadece posterler için)
        preview_ids = [(l.media_type, tid) for tid in item_ids]
        details = await tmdb_client.get_batch_details(preview_ids, lang_config=lang_config)
        posters = [build_image_url(d.get("poster_path")) for d in details if d.get("poster_path")]
        
        # Öğe sayısı
        count_query = await session.exec(
            select(func.count(CustomListItem.id)).where(CustomListItem.list_id == l.id)
        )
        items_count = count_query.first() or 0

        data.append({
            "id": l.id,
            "title": l.title,
            "slug": l.slug,
            "media_type": l.media_type,
            "description": l.description,
            "is_private": l.is_private,
            "posters": posters,
            "items_count": items_count,
            "created_at": l.created_at
        })
    
    return data

@router.get("/{username}/{slug}", response_model=CustomListRead)
async def get_custom_list_by_slug(
    *,
    session: AsyncSession = Depends(get_session),
    username: str,
    slug: str,
    current_user: User | None = Depends(get_optional_current_user),
    lang_config: dict = Depends(get_lang_config)
):
    """Kullanıcı adı ve slug üzerinden liste detaylarını getirir."""
    query = select(User).where(User.username == username)
    result = await session.exec(query)
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    query = select(CustomList).where(
        CustomList.user_id == user.id,
        CustomList.slug == slug
    ).options(selectinload(CustomList.items))
    
    result = await session.exec(query)
    db_list = result.first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")
    
    # Gizlilik kontrolü
    if db_list.is_private:
        if not current_user or current_user.id != db_list.user_id:
            raise HTTPException(status_code=404, detail="Liste bulunamadı")
    
    # Hidrasyon
    item_ids = [(db_list.media_type, it.tmdb_id) for it in db_list.items]
    details = await tmdb_client.get_batch_details(item_ids, lang_config=lang_config)
    
    hydrated_items = []
    for it, detail in zip(db_list.items, details):
        item_dict = it.model_dump()
        item_dict["title"] = detail.get("title") or detail.get("name") or "Unknown"
        item_dict["poster_path"] = build_image_url(detail.get("poster_path"))
        hydrated_items.append(item_dict)
    
    list_data = db_list.model_dump()
    list_data["items"] = hydrated_items
    
    return list_data

@router.get("/id/{list_id}", response_model=CustomListRead)
async def get_custom_list_by_id(
    *,
    session: AsyncSession = Depends(get_session),
    list_id: int,
    lang_config: dict = Depends(get_lang_config)
):
    """ID üzerinden liste detaylarını getirir (Internal kullanım için)."""
    query = select(CustomList).where(CustomList.id == list_id).options(selectinload(CustomList.items))
    result = await session.exec(query)
    db_list = result.first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")
    
    # Hidrasyon
    item_ids = [(db_list.media_type, it.tmdb_id) for it in db_list.items]
    details = await tmdb_client.get_batch_details(item_ids, lang_config=lang_config)
    
    hydrated_items = []
    for it, detail in zip(db_list.items, details):
        item_dict = it.model_dump()
        item_dict["title"] = detail.get("title") or detail.get("name") or "Unknown"
        item_dict["poster_path"] = build_image_url(detail.get("poster_path"))
        hydrated_items.append(item_dict)
    
    list_data = db_list.model_dump()
    list_data["items"] = hydrated_items
    
    return list_data

@router.delete("/{list_id}")
async def delete_custom_list(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    list_id: int
):
    """Listeyi siler."""
    db_list = await session.get(CustomList, list_id)
    if not db_list:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")
    if db_list.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    await session.delete(db_list)
    await session.commit()
    return {"status": "success"}

@router.post("/{list_id}/items", response_model=CustomListRead)
async def add_items_to_list(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    list_id: int,
    items_in: List[CustomListItemCreate],
    lang_config: dict = Depends(get_lang_config)
):
    """Listeye yeni öğeler ekler."""
    db_list = await session.get(CustomList, list_id)
    if not db_list:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")
    if db_list.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    for item_in in items_in:
        db_item = CustomListItem(
            list_id=list_id,
            tmdb_id=item_in.tmdb_id
        )
        session.add(db_item)
    
    await session.commit()
    
    # Eager load items for response and hydrate
    query = select(CustomList).where(CustomList.id == list_id).options(selectinload(CustomList.items))
    result = await session.exec(query)
    db_list = result.one()
    
    # Hidrasyon
    item_ids = [(db_list.media_type, it.tmdb_id) for it in db_list.items]
    details = await tmdb_client.get_batch_details(item_ids, lang_config=lang_config)
    
    hydrated_items = []
    for it, detail in zip(db_list.items, details):
        item_dict = it.model_dump()
        item_dict["title"] = detail.get("title") or detail.get("name") or "Unknown"
        item_dict["poster_path"] = build_image_url(detail.get("poster_path"))
        hydrated_items.append(item_dict)
    
    list_data = db_list.model_dump()
    list_data["items"] = hydrated_items
    
    return list_data

@router.delete("/{list_id}/items/{tmdb_id}")
async def remove_item_from_list(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    list_id: int,
    tmdb_id: int
):
    """Listeden belirli bir öğeyi çıkarır."""
    db_list = await session.get(CustomList, list_id)
    if not db_list:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")
    if db_list.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    query = select(CustomListItem).where(
        CustomListItem.list_id == list_id,
        CustomListItem.tmdb_id == tmdb_id
    )
    result = await session.exec(query)
    db_item = result.first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Öğe listede bulunamadı")
        
    await session.delete(db_item)
    await session.commit()
    
    return {"status": "success", "message": "Öğe listeden çıkarıldı."}
