/**
 * Bildirim sistemi context'i.
 *
 * SSE (Server-Sent Events) üzerinden gerçek zamanlı bildirim alır,
 * bildirim listesini ve okunmamış sayıyı merkezi olarak yönetir.
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

    // İlk yüklemede geçmiş bildirimleri ve okunmamış sayısını çek
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

    // SSE bağlantısını kur
    const connectSSE = useCallback(async () => {
        if (!user) return;

        // Hafızadaki token'ı kullan (Deadlock engellemek için)
        const token = getAccessToken();
        
        if (!token) {
            // Eğer token henüz set edilmemişse kısa süre sonra tekrar dene
            setTimeout(connectSSE, 1000);
            return;
        }

        // Önceki bağlantıyı kapat
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
                    // Mevcut bildirimi çıkar (eğer varsa, aggregation için)
                    const filtered = prev.filter((n) => n.id !== data.id);
                    // Yeni veriyi başa ekle
                    return [data, ...filtered].slice(0, 20);
                });
                setUnreadCount((prev) => prev + 1);
            } catch (err) {
                console.error("SSE mesaj parse hatası:", err);
            }
        });

        es.addEventListener("ping", () => {
            // Heartbeat — bağlantıyı canlı tutar
        });

        es.onerror = () => {
            es.close();
            eventSourceRef.current = null;
            // 5 saniye sonra yeniden bağlan
            retryTimeoutRef.current = setTimeout(() => {
                connectSSE();
            }, 5000);
        };

        eventSourceRef.current = es;
    }, [user]);

    // user değiştiğinde SSE bağlantısını yönet
    useEffect(() => {
        if (user) {
            fetchInitialData();
            connectSSE();
        } else {
            // Kullanıcı çıkış yaptığında temizle
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
