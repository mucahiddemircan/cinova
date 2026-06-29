/**
 * Follow list page component.
 *
 * Lists people followed by user (actors/directors)
 * and followers/followed users.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { followsApi } from "../api";
import PersonCard from "../components/content/PersonCard";
import useScrollRestoration from "../hooks/useScrollRestoration";
import { Users } from "lucide-react";

import NotFound from "./NotFound";
import ErrorState from "../components/common/ErrorState";

export default function FollowsView({ user }) {
    const { t } = useLanguage();
    const { username, type } = useParams(); // type: 'followers' | 'following'
    const navigate = useNavigate();
    const [data, setData] = useState({ users: [], people: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("user"); // 'user' or 'person' (only for following)
    const [sortBy, setSortBy] = useState("alpha"); // 'alpha' or 'recent'

    // Scroll restoration
    const scrollKey = `follows_scroll_${username}_${type}_${activeTab}_${sortBy}`;
    useScrollRestoration(scrollKey, !loading);

    useEffect(() => {
        setLoading(true);
        setError(null);
        const fetchData = async () => {
            try {
                if (type === "followers") {
                    const followers = await followsApi.getFollowers(username);
                    setData({ users: followers, people: [] });
                    setActiveTab("user");
                } else {
                    const following = await followsApi.getFollowing(username);
                    setData(following);
                }
            } catch (err) {
                console.error("Takip verisi yükleme hatası:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [username, type]);

    if (loading) {
        return (
            <div className="animate-fade-in max-w-7xl mx-auto px-4 pb-12">
                <header className="pt-8 pb-6 mb-10 border-b border-white/5">
                    <div className="flex flex-col gap-6">
                        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                        <div className="h-10 w-48 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
                    </div>
                </header>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                        <div key={i} className="flex flex-col items-center gap-4 py-6">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/5 animate-pulse" />
                            <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error?.status === 404) {
        return <NotFound />;
    }

    if (error) {
        return (
            <ErrorState 
                title={error?.message || t("common.error")}
                subtitle={t("follows.emptySub")}
                buttonText={t("common.backToHome")}
                buttonLink="/"
                errorCode={error?.status === 404 ? "404" : null}
            />
        );
    }

    const title = type === "followers" ? t("follows.followers") : t("follows.following");
    const items = activeTab === "user" ? (data.users || []) : (data.people || []);

    const sortedItems = [...items].sort((a, b) => {
        if (sortBy === "alpha") {
            const nameA = activeTab === "user" ? a.username : a.name;
            const nameB = activeTab === "user" ? b.username : b.name;
            return nameA.localeCompare(nameB, 'tr');
        }
        return 0;
    });

    if (sortBy === "recent") {
        sortedItems.reverse();
    }

    return (
        <div className="animate-fade-in max-w-7xl mx-auto px-4 pb-12">
            <header className="sticky top-0 z-30 bg-bg-base/95 backdrop-blur-md pt-8 pb-6 mb-10 border-b border-white/5">
                <div className="flex flex-col gap-6">
                    <div>

                        <h1 className="text-3xl font-black text-text-primary tracking-tight mb-1">
                            {title}
                        </h1>
                        <p className="text-text-secondary text-sm font-medium opacity-60">
                            {type === 'followers'
                                ? t("follows.followersSub", { username })
                                : (activeTab === 'user' ? t("follows.followingProfilesSub", { username }) : t("follows.followingPeopleSub", { username }))
                            }
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {type === "following" && data.people.length > 0 && (
                            <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-lg backdrop-blur-sm w-full sm:w-auto overflow-hidden">
                                <button
                                    onClick={() => setActiveTab("user")}
                                    className={`flex-1 sm:px-6 py-2 rounded-full font-bold transition-all cursor-pointer text-[11px] whitespace-nowrap ${activeTab === "user" ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"}`}
                                >
                                    {t("follows.profilesTab")}
                                </button>
                                <button
                                    onClick={() => setActiveTab("person")}
                                    className={`flex-1 sm:px-6 py-2 rounded-full font-bold transition-all cursor-pointer text-[11px] whitespace-nowrap ${activeTab === "person" ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"}`}
                                >
                                    {t("follows.peopleTab")}
                                </button>
                            </div>
                        )}

                        <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-lg w-full sm:w-auto overflow-hidden">
                            <button
                                onClick={() => setSortBy("alpha")}
                                className={`flex-1 sm:px-6 py-2 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${sortBy === 'alpha' ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"}`}
                            >
                                {t("follows.sortAlpha")}
                            </button>
                            <button
                                onClick={() => setSortBy("recent")}
                                className={`flex-1 sm:px-6 py-2 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${sortBy === 'recent' ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"}`}
                            >
                                {type === "followers" ? t("follows.sortRecentFollowers") : t("follows.sortRecentFollowing")}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {sortedItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 rounded-2xl overflow-hidden">
                    {sortedItems.map((item) => {
                        const id = activeTab === "user" ? item.username : item.id;
                        const personProp = activeTab === "user" ? {
                            ...item,
                            name: item.username,
                            title: item.username,
                            type: "profile",
                            known_for_department: t("follows.profileTag"),
                            profile_path: item.avatar_url
                        } : item;

                        return (
                            <div key={id}>
                                <PersonCard person={personProp} />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 bg-bg-surface/10 rounded-[4rem] border-2 border-dashed border-white/5">
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Users size={40} strokeWidth={1.5} className="text-text-secondary opacity-20" />
                    </div>
                    <h3 className="text-2xl font-bold text-text-secondary opacity-50">
                        {type === 'followers' ? t("follows.noFollowers") : t("follows.noFollowing")}
                    </h3>
                    <p className="text-text-secondary/30 mt-2 font-medium">{t("follows.emptySub")}</p>
                </div>
            )}
        </div>
    );
}
