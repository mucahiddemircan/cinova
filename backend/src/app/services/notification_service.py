from typing import List, Any
from sqlmodel import select, func, and_
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Notification, NotificationRead, User, CommentInteraction
from app.services.notification_manager import notification_manager
from app.core.constants import NotificationType
from app.core.datetime_utils import utc_now
from app.utils.i18n_utils import metadata_service

class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_notifications(self, user_id: int, limit: int = 20, offset: int = 0) -> List[NotificationRead]:
        """Kullanıcının bildirimlerini döner (en yeni önce)."""
        # Beğeni sayılarını topluca almak için subquery (sadece like)
        likes_count_sub = (
            select(CommentInteraction.comment_id, func.count(CommentInteraction.id).label("count"))
            .where(CommentInteraction.interaction_type == "like")
            .group_by(CommentInteraction.comment_id)
            .subquery()
        )

        query = (
            select(
                Notification, 
                User.username,
                User.avatar_url,
                func.coalesce(likes_count_sub.c.count, 1).label("likes_count")
            )
            .join(User, Notification.actor_id == User.id)
            .outerjoin(likes_count_sub, Notification.comment_id == likes_count_sub.c.comment_id)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(min(limit, 20))
        )
        results = await self.session.exec(query)

        notifications = []
        for notif, actor_username, actor_avatar_url, likes_count in results:
            # Beğeni ise gerçek sayıyı kullan, değilse 1 varsay
            display_count = likes_count if notif.type == NotificationType.COMMENT_LIKE else 1
            
            # Beğeni ise aktör bilgilerini anonimleştir
            if notif.type == NotificationType.COMMENT_LIKE:
                display_username = ""
                actor_avatar_url = None
                actor_initial = "♥"
            else:
                display_username = actor_username
                actor_initial = actor_username[0].upper() if actor_username else "?"
            
            message = self._build_message(notif.type, display_username, display_count)
            
            notifications.append(NotificationRead(
                id=notif.id,
                type=notif.type,
                actor_username=display_username,
                actor_initial=actor_initial,
                actor_avatar_url=actor_avatar_url,
                comment_id=notif.comment_id,
                tmdb_id=notif.tmdb_id,
                media_type=notif.media_type,
                message=message,
                is_read=notif.is_read,
                created_at=notif.created_at,
            ))

        return notifications

    async def get_unread_count(self, user_id: int) -> int:
        """Okunmamış bildirim sayısını döner."""
        count = (await self.session.exec(
            select(func.count()).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
        )).first()
        return count or 0

    async def mark_all_as_read(self, user_id: int) -> int:
        """Tüm bildirimleri okundu olarak işaretler."""
        query = select(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        results = await self.session.exec(query)
        notifications = results.all()

        for notif in notifications:
            notif.is_read = True
            self.session.add(notif)

        await self.session.commit()
        return len(notifications)

    async def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Tek bir bildirimi okundu olarak işaretler."""
        notif = await self.session.get(Notification, notification_id)
        if not notif or notif.user_id != user_id:
            return False
        
        notif.is_read = True
        self.session.add(notif)
        await self.session.commit()
        return True

    async def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Bir bildirimi siler."""
        notif = await self.session.get(Notification, notification_id)
        if not notif or notif.user_id != user_id:
            return False
        
        await self.session.delete(notif)
        await self.session.commit()
        return True

    def _build_message(self, notification_type: str, actor_username: str, count: int = 1) -> str:
        """Bildirim tipine göre mesaj oluşturur."""
        if notification_type == NotificationType.COMMENT_LIKE:
            return f"Yorumunuzu {count} kişi beğendi."
        
        messages = {
            NotificationType.FOLLOW: f"{actor_username} sizi takip etti.",
            NotificationType.COMMENT_REPLY: f"{actor_username} yorumunuza yanıt verdi.",
        }
        return messages.get(notification_type, "Yeni bir bildiriminiz var.")

    async def create_and_send(
        self,
        user_id: int,
        actor_id: int,
        actor_username: str,
        notification_type: str,
        comment_id: int | None = None,
        tmdb_id: int | None = None,
        media_type: str | None = None,
    ) -> None:
        """Bildirim oluşturur, kaydeder ve SSE ile gönderir."""
        if user_id == actor_id:
            return

        notification = None
        if notification_type == NotificationType.COMMENT_LIKE:
            existing_stmt = select(Notification).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.type == NotificationType.COMMENT_LIKE,
                    Notification.comment_id == comment_id
                )
            )
            existing_res = await self.session.exec(existing_stmt)
            notification = existing_res.first()
            
            if notification:
                notification.created_at = utc_now()
                notification.is_read = False
                notification.actor_id = actor_id
                self.session.add(notification)
            
        if not notification:
            notification = Notification(
                user_id=user_id,
                actor_id=actor_id,
                type=notification_type,
                comment_id=comment_id,
                tmdb_id=tmdb_id,
                media_type=media_type,
            )
            self.session.add(notification)
        
        await self.session.commit()
        await self.session.refresh(notification)

        # SSE Gönderimi için veri hazırla
        display_count = 1
        display_username = actor_username
        
        if notification_type == NotificationType.COMMENT_LIKE:
            count_stmt = select(func.count()).where(
                and_(
                    CommentInteraction.comment_id == comment_id,
                    CommentInteraction.interaction_type == "like"
                )
            )
            count_res = await self.session.exec(count_stmt)
            display_count = count_res.first() or 1
            display_username = ""

        message = self._build_message(notification_type, display_username, display_count)
        
        actor_avatar_url = None
        actor_initial = actor_username[0].upper() if actor_username else "♥"
        
        if notification_type != NotificationType.COMMENT_LIKE:
            actor_user = await self.session.get(User, actor_id)
            if actor_user:
                actor_avatar_url = actor_user.avatar_url
                actor_initial = actor_user.username[0].upper()
        
        sse_data = {
            "id": notification.id,
            "type": notification.type,
            "actor_username": display_username,
            "actor_initial": actor_initial,
            "actor_avatar_url": actor_avatar_url,
            "comment_id": notification.comment_id,
            "tmdb_id": notification.tmdb_id,
            "media_type": notification.media_type,
            "message": message,
            "is_read": False,
            "created_at": notification.created_at.isoformat(),
        }

        await notification_manager.send(user_id, sse_data)
