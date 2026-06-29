/**
 * Notification system context.
 *
 * Receives real-time notifications via SSE (Server-Sent Events),
 * and centrally manages notification list and unread count.
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { notificationsApi, getAccessToken } from "../api";
import { supabase } from "../utils/supabaseClient";

const NotificationContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function NotificationProvider({ user, children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const eventSourceRef = useRef(null);
    const retryTimeoutRef = useRef(null);

    // Fetch notification history and unread count on initial load
    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        try {
            const [notifs, countData] = await Promise.all([
                notificationsApi.getAll(20, 0),
                notificationsApi.getUnreadCount(),
            ]);
            setNotifications(notifs);
            setUnreadCount(countData.count);
        } catch (err) {
            console.error("Bildirim verisi çekme hatası:", err);
        }
    }, [user]);

    // Establish SSE connection
    const connectSSE = useCallback(async () => {
        if (!user) return;

        // Use in-memory token (to prevent deadlock)
        const token = getAccessToken();
        
        if (!token) {
            // If token is not set yet, retry shortly
            setTimeout(connectSSE, 1000);
            return;
        }

        // Close previous connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const es = new EventSource(`${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`, {
            withCredentials: true,
        });

        es.addEventListener("notification", (event) => {
            try {
                const data = JSON.parse(event.data);
                setNotifications((prev) => {
                    // Remove current notification (for aggregation, if exists)
                    const filtered = prev.filter((n) => n.id !== data.id);
                    // Prepend new data
                    return [data, ...filtered].slice(0, 20);
                });
                setUnreadCount((prev) => prev + 1);
            } catch (err) {
                console.error("SSE mesaj parse hatası:", err);
            }
        });

        es.addEventListener("ping", () => {
            // Heartbeat — keeps connection alive
        });

        es.onerror = () => {
            es.close();
            eventSourceRef.current = null;
            // Reconnect after 5 seconds
            retryTimeoutRef.current = setTimeout(() => {
                connectSSE();
            }, 5000);
        };

        eventSourceRef.current = es;
    }, [user]);

    // Manage SSE connection when user changes
    useEffect(() => {
        if (user) {
            fetchInitialData();
            connectSSE();
        } else {
            // Clean up when user logs out
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            setNotifications([]);
            setUnreadCount(0);
        }

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [user, fetchInitialData, connectSSE]);

    const markAllRead = useCallback(async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error("Bildirimleri okundu işaretleme hatası:", err);
        }
    }, []);

    const markOneRead = useCallback(async (id) => {
        try {
            await notificationsApi.markOneRead(id);
            setNotifications((prev) =>
                prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Bildirim okundu işaretleme hatası:", err);
        }
    }, []);

    const deleteNotification = useCallback(async (id) => {
        try {
            const result = await notificationsApi.deleteOne(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (result.was_unread) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error("Bildirim silme hatası:", err);
        }
    }, []);

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, markAllRead, markOneRead, deleteNotification }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
    return ctx;
}
