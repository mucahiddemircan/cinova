"""Bildirim sistemi endpointleri.

SSE stream, bildirim listesi, okundu işaretleme ve
okunmamış sayı sorgulama işlemlerini yönetir.
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import select, func, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from sse_starlette.sse import EventSourceResponse
from typing import List

from app.core.database import get_session
from app.dependencies import get_current_user, get_current_user_sse, get_notification_service
from app.models import NotificationRead, User
from app.services.notification_manager import notification_manager
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/stream")
async def notification_stream(
    request: Request,
    current_user: User = Depends(get_current_user_sse)
):
    """SSE Stream üzerinden anlık bildirimleri iletir."""
    async def event_generator():
        queue = notification_manager.connect(current_user.id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                try:
                    # 30 saniye timeout ile bekle (ping/heartbeat için)
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    
                    # Eğer data string ise (manager json.dumps yapmış olabilir)
                    if isinstance(data, str):
                        import json
                        data_dict = json.loads(data)
                    else:
                        data_dict = data
                        
                    yield {
                        "event": "notification",
                        "id": str(data_dict.get("id")),
                        "data": data_dict
                    }
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": ""}
        finally:
            notification_manager.disconnect(current_user.id, queue)

    return EventSourceResponse(event_generator())

@router.get("/", response_model=List[NotificationRead])
async def list_notifications(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Kullanıcının bildirim geçmişini listeler."""
    return await service.get_user_notifications(current_user.id, limit=limit, offset=offset)

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Okunmamış bildirim sayısını döner."""
    count = await service.get_unread_count(current_user.id)
    return {"count": count}

@router.post("/read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Tüm bildirimleri okundu olarak işaretler."""
    count = await service.mark_all_as_read(current_user.id)
    return {"status": "success", "updated": count}

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Belirli bir bildirimi okundu olarak işaretler."""
    success = await service.mark_as_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    return {"status": "success"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Bir bildirimi siler."""
    success = await service.delete_notification(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    return {"status": "success"}

async def create_and_send_notification(
    session: AsyncSession,
    user_id: int,
    actor_id: int,
    actor_username: str,
    notification_type: str,
    comment_id: int | None = None,
    tmdb_id: int | None = None,
    media_type: str | None = None,
):
    """Helper function to be called from other endpoints."""
    service = NotificationService(session)
    await service.create_and_send(
        user_id=user_id,
        actor_id=actor_id,
        actor_username=actor_username,
        notification_type=notification_type,
        comment_id=comment_id,
        tmdb_id=tmdb_id,
        media_type=media_type
    )
