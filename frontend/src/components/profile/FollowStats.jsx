import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

export default function FollowStats({ followersCount, followingCount, isPerson, username }) {
    const { t } = useLanguage();
    const followersLink = `/${username}/followers`;
    const followingLink = `/${username}/following`;

    return (
        <div className="flex items-center gap-6">
            <Link
                to={followersLink}
                className="transition-all hover:underline"
            >
                <span className="text-[16px] font-bold text-white">
                    {followersCount || 0}
                </span>
                <span className="text-[16px] text-text-secondary"> {t("follows.followers")}</span>
            </Link>
            {!isPerson && (
                <Link
                    to={followingLink}
                    className="transition-all hover:underline"
                >
                    <span className="text-[16px] font-bold text-white">
                        {followingCount || 0}
                    </span>
                    <span className="text-[16px] text-text-secondary"> {t("follows.following")}</span>
                </Link>
            )}
        </div>
    );
}
