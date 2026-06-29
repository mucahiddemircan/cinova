import { Film, Tv, User, Image as ImageIcon } from "lucide-react";
import { memo } from "react";

interface PlaceholderImageProps {
  type: "movie" | "series" | "person" | "profile" | string;
  iconSize?: number;
  className?: string;
}

/**
 * Standard placeholder component used application-wide.
 */
function PlaceholderImage({
  type,
  iconSize,
  className = "",
}: PlaceholderImageProps) {
  // Determine the appropriate icon by type
  const getIcon = () => {
    const props = {
      size: iconSize || (type === "profile" || type === "person" ? 24 : 32),
      strokeWidth: 1.5,
      className: "text-[#a3a3a3]",
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
        return <ImageIcon {...props} />;
    }
  };

  return (
    <div
      className={`w-full h-full bg-[#333333] flex items-center justify-center ${className}`}
    >
      {getIcon()}
    </div>
  );
}

export default memo(PlaceholderImage);
