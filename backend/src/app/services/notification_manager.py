"""SSE bildirim bağlantı yöneticisi.

Kullanıcı bazlı asyncio.Queue'larla SSE stream'lerini yönetir.
Her aktif EventSource bağlantısı bir Queue ile temsil edilir.
"""

import asyncio
import json
from typing import Any


class NotificationManager:
    """In-memory SSE bağlantı yöneticisi (singleton olarak kullanılır)."""

    def __init__(self):
        self._connections: dict[int, list[asyncio.Queue]] = {}

    def connect(self, user_id: int) -> asyncio.Queue:
        """Yeni bir SSE bağlantısı oluşturur ve kuyruğu döner."""
        queue: asyncio.Queue = asyncio.Queue()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(queue)
        return queue

    def disconnect(self, user_id: int, queue: asyncio.Queue) -> None:
        """SSE bağlantısı kapandığında kuyruğu listeden kaldırır."""
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(queue)
            except ValueError:
                pass
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send(self, user_id: int, notification: dict[str, Any]) -> None:
        """Belirtilen kullanıcının tüm aktif bağlantılarına bildirim gönderir."""
        if user_id not in self._connections:
            return
        data = json.dumps(notification, default=str)
        for queue in self._connections[user_id]:
            await queue.put(data)

    def is_connected(self, user_id: int) -> bool:
        """Kullanıcının aktif SSE bağlantısı olup olmadığını döner."""
        return user_id in self._connections and len(self._connections[user_id]) > 0


notification_manager = NotificationManager()
