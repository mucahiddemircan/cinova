import { Film, Tv, User, Image } from "lucide-react";

/**
 * Uygulama genelinde kullanılan standart yer tutucu (placeholder) bileşeni.
 * 
 * @param {string} type - İçerik tipi: 'movie', 'series', 'person', 'profile'
 * @param {number} iconSize - İkonun boyutu (opsiyonel)
 * @param {string} className - Ek CSS sınıfları (opsiyonel)
 */
export default function PlaceholderImage({ type, iconSize, className = "" }) {
    // Tipe göre uygun ikonu belirle
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
