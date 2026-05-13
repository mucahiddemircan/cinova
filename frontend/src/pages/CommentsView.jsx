/**
 * Yorum tam ekran sayfası bileşeni.
 *
 * İçeriğe ait tüm yorumları tam sayfa görünümde
 * CommentSystem bileşeni ile sunar.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { contentApi } from "../api";
import CommentSystem from "../components/comments/CommentSystem";

export default function CommentsView({ user }) {
    const { id } = useParams();
    const location = useLocation();
    const type = location.pathname.includes("/series/") ? "series" : "movie";
    const navigate = useNavigate();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        contentApi.getById(type, id)
            .then(data => setContent(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [type, id]);

    if (loading) {
        return <div className="text-center py-20 text-white">Yükleniyor...</div>;
    }

    if (!content) {
        return <div className="text-center py-20 text-white">İçerik bulunamadı.</div>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">


            <div className="flex items-center gap-6 mb-12 p-6 bg-bg-surface rounded-3xl border border-white/5 shadow-xl shadow-black/20">
                <div className="w-20 md:w-24 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0">
                    <img src={content.poster_path} alt={content.title} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">{content.title}</h1>
                    <p className="text-text-secondary text-sm font-medium">Tüm Yorumlar</p>
                </div>
            </div>

            <div className="bg-bg-base">
                <CommentSystem type={type} id={id} user={user} isFullView={true} />
            </div>
        </div>
    );
}
