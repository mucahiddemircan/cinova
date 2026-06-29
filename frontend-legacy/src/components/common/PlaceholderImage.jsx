import { Film, Tv, User, Image } from "lucide-react";

/**
 * Standard placeholder component used application-wide.
 * 
 * @param {string} type - Content type: 'movie', 'series', 'person', 'profile'
 * @param {number} iconSize - Icon size (optional)
 * @param {string} className - Additional CSS classes (optional)
 */
export default function PlaceholderImage({ type, iconSize, className = "" }) {
    // Determine the appropriate icon by type
    const getIcon = () => {
        const props = {
            size: iconSize || (type === "profile" || type === "person" ? 24 : 32),
            strokeWidth: 1.5,
            className: "text-[#a3a3a3]"
        };

        switch (type) {
            case "movie":
                return <Film {...props} />;
            case "series":
                return <Tv {...props} />;
            case "person":
            case "profile":
                return <User {...props} />;
            default:
                return <Image {...props} />;
        }
    };

    return (
        <div className={`w-full h-full bg-[#333333] flex items-center justify-center ${className}`}>
            {getIcon()}
        </div>
    );
}
