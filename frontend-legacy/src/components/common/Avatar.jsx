import PlaceholderImage from "./PlaceholderImage";

/**
 * Standard avatar/profile picture component used application-wide.
 * 
 * @param {string} src - Image URL
 * @param {string} alt - Alternative text
 * @param {string} size - Size: 'xs', 'sm', 'md', 'lg', 'xl', '2xl' or custom CSS class
 * @param {string} type - Placeholder type: 'profile' or 'person'
 * @param {string} className - Additional CSS classes
 * @param {boolean} showBorder - Should border be shown? (Default: true)
 * @param {string} borderColor - Border color (Default: 'default')
 */
export default function Avatar({
    src,
    alt,
    size = "md",
    type = "profile",
    className = "",
    showBorder = true,
    borderColor = "default"
}) {
    // Standard size mappings
    const sizeMap = {
        "xs": "w-6 h-6",
        "sm": "w-8 h-8",
        "md": "w-10 h-10",
        "lg": "w-12 h-12",
        "xl": "w-32 h-32",
        "2xl": "w-40 h-40 lg:w-52 lg:h-52"
    };

    const borderMap = {
        "default": "border-white/5",
        "brand": "border-brand/20",
        "white": "border-white/10"
    };

    const resolvedSize = sizeMap[size] || size;
    const resolvedBorder = showBorder ? borderMap[borderColor] : "border-transparent";

    // Calculate icon size (about 50% of size)
    const getIconSize = () => {
        if (size === "xs") return 12;
        if (size === "sm") return 16;
        if (size === "md") return 20;
        if (size === "lg") return 24;
        if (size === "xl") return 60;
        if (size === "2xl") return 80;
        return 20;
    };

    return (
        <div className={`rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-bg-surface-hover transition-all duration-300 relative group/avatar ${resolvedSize} ${showBorder ? 'border' : ''} ${resolvedBorder} ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt || "Avatar"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <PlaceholderImage type={type} iconSize={getIconSize()} />
            )}

            {/* Hover overlay - slight darkening */}
            <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/20 transition-colors duration-300 pointer-events-none" />
        </div>
    );
}
