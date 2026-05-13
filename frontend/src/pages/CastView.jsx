/**
 * Kadro ve ekip sayfası bileşeni.
 *
 * İçeriğin tüm oyuncularını ve teknik ekibini departman bazlı
 * filtreleye ve kart görünümüyle sunar.
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { contentApi } from "../api";
import { ChevronLeft } from "lucide-react";
import PlaceholderImage from "../components/common/PlaceholderImage";
import Avatar from "../components/common/Avatar";
import useScrollRestoration from "../hooks/useScrollRestoration";
import { truncateRoles } from "../utils";

import LoadingDots from "../components/common/LoadingDots";

export default function CastView() {
    const { t } = useLanguage();
    const { id } = useParams();
    const location = useLocation();
    const type = location.pathname.includes("/series/") ? "series" : "movie";
    const navigate = useNavigate();
    const [castData, setCastData] = useState(null);
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(null);

    useScrollRestoration(`cast_scroll_${type}_${id}`, !loading);

    const toggleFilter = (filterId) => {
        setActiveFilter(prev => prev === filterId ? null : filterId);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            contentApi.getById(type, id),
            contentApi.getCast(type, id)
        ])
            .then(([movieData, cData]) => {
                setMovie(movieData);
                setCastData(cData);
            })
            .catch((err) => console.error("Hata:", err))
            .finally(() => setLoading(false));
    }, [type, id]);

    const groupedCrew = useMemo(() => {
        if (!castData || !castData.crew) return {};

        const departments = [
            "Directing", "Writing", "Production", "Camera", "Art", 
            "Costume & Make-Up", "Visual Effects", "Sound", "Editing", "Crew"
        ];
 
        const grouped = {};
        castData.crew.forEach(member => {
            const deptKey = member.department || "Crew";
            const trName = t(`departments.${deptKey}`) || t("departments.Other");
 
            if (!grouped[trName]) {
                grouped[trName] = [];
            }
            grouped[trName].push(member);
        });
 
        const sortedGrouped = {};
        departments.forEach(key => {
            const trName = t(`departments.${key}`);
            if (grouped[trName] && grouped[trName].length > 0) {
                sortedGrouped[trName] = grouped[trName];
            }
        });
 
        // Add others if any
        Object.keys(grouped).forEach(name => {
            if (!sortedGrouped[name]) {
                sortedGrouped[name] = grouped[name];
            }
        });
 
        return sortedGrouped;
    }, [castData, t]);

    if (loading) {
        return (
            <div className="text-center py-40">
                <LoadingDots size="lg" className="text-white/20" />
            </div>
        );
    }

    if (!castData || !movie) {
        return <div className="text-center py-20 text-white font-medium opacity-50">{t("cast.noData")}</div>;
    }

    const CastMemberCard = ({ person, subtext }) => {
        const navPath = `/people/${person.id}`;

        return (
            <div
                onClick={() => navigate(navPath)}
                className="group/card flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer select-none border border-transparent hover:border-white/5"
            >
                <Avatar
                    src={person.profile_path}
                    alt={person.name}
                    size="lg"
                    type="person"
                />
                <div className="flex-1 min-w-0">
                    <Link
                        to={navPath}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-bold text-white hover:underline transition-none truncate block"
                    >
                        {person.name}
                    </Link>
                    <p className="text-[11px] text-white/40 font-medium mt-0.5">
                        {truncateRoles(subtext || t("cast.title"), t)}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16 px-2">
                <div className="flex items-center gap-6">

                    <div className="text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            {movie.title}
                            <span className="text-white/20 font-medium ml-3">
                                {movie.release_date ? new Date(movie.release_date).getFullYear() : ""}
                            </span>
                        </h1>
                        <p className="text-sm text-text-secondary font-medium mt-1 opacity-50">{t("cast.fullCastAndCrew")}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toggleFilter('cast')}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${activeFilter === 'cast'
                            ? "bg-white text-black border-white shadow-lg shadow-white/5"
                            : "bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white/70"
                            }`}
                    >
                        {t("cast.actors")} ({castData.cast?.length || 0})
                    </button>
                    <button
                        onClick={() => toggleFilter('crew')}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${activeFilter === 'crew'
                            ? "bg-white text-black border-white shadow-lg shadow-white/5"
                            : "bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white/70"
                            }`}
                    >
                        {t("cast.crew")} ({castData.crew?.length || 0})
                    </button>
                </div>
            </div>

            <div className="space-y-20">
                {(activeFilter === null || activeFilter === 'cast') && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-8">
                            <h2 className="text-lg font-bold text-white px-2 py-1.5">{t("cast.actors")}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {castData.cast?.map((person) => (
                                <CastMemberCard
                                    key={`cast-${person.id}-${person.known_for_department}`}
                                    person={person}
                                    subtext={person.known_for_department}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {(activeFilter === null || activeFilter === 'crew') && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-8">
                            <h2 className="text-lg font-bold text-white px-2 py-1.5">{t("cast.crew")}</h2>
                        </div>

                        <div className="space-y-16">
                            {Object.entries(groupedCrew).map(([deptName, members]) => (
                                <div key={deptName}>
                                    <h3 className="text-xs font-bold text-white/70 mb-4 text-center md:text-left pl-2">
                                        {deptName}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {members.map((person, idx) => (
                                            <CastMemberCard
                                                key={`crew-${person.id}-${idx}`}
                                                person={person}
                                                subtext={person.known_for_department}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
