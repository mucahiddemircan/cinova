"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { truncateRoles } from "@/lib/utils";
import Avatar from "../common/Avatar";
import CardActions from "./CardActions";
import LocalizedLink from "../common/LocalizedLink";
import type { User } from "@/types";

interface PersonCardProps {
  person: any;
  basePath?: string;
  variant?: "default" | "small";
  user: User | null;
}

export default function PersonCard({
  person,
  basePath,
  variant = "default",
  user,
}: PersonCardProps) {
  const { t, getLocalizedPath } = useLanguage();
  const router = useRouter();

  const title = person.title || person.name || t("person.unnamed");
  const rawPosterPath = person.poster_path || person.profile_path;
  const posterPath =
    rawPosterPath && !rawPosterPath.startsWith("http")
      ? `https://image.tmdb.org/t/p/w500${rawPosterPath}`
      : rawPosterPath;
  const role = person.role || person.known_for_department || person.department;

  const getNavPath = () => {
    if (person.type === "profile") {
      return `/${title}`;
    }
    return `/people/${person.id}`;
  };

  const handleClick = () => {
    router.push(getLocalizedPath(getNavPath()));
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const isSmall = variant === "small";

  return (
    <div
      onClick={handleClick}
      className={`group/card cursor-pointer flex flex-col items-center w-full transition-all duration-300 relative ${
        isSmall
          ? "py-4 px-2 hover:bg-white/[0.08]"
          : "py-6 px-4 hover:bg-white/[0.08]"
      }`}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <CardActions
        movie={{
          id: person.id,
          title: title,
          type: person.type || "person",
          poster_path: posterPath,
        }}
        user={user}
      />
      <div
        className={`relative mb-4 ${
          isSmall ? "w-16 h-16 sm:w-20 sm:h-20" : "w-24 h-24 sm:w-28 sm:h-28"
        } flex items-center justify-center`}
      >
        <Avatar
          src={posterPath}
          alt={title}
          size={
            isSmall ? "w-16 h-16 sm:w-20 sm:h-20" : "w-24 h-24 sm:w-28 sm:h-28"
          }
          type={person.type || "person"}
        />
      </div>

      <div className="flex flex-col items-center text-center w-full min-w-0">
        <h3
          className={`${
            isSmall ? "text-xs" : "text-sm"
          } font-bold text-text-primary w-full pb-1`}
        >
          <LocalizedLink
            href={getNavPath()}
            onClick={stopPropagation}
            className="inline-block max-w-full line-clamp-2 hover:underline transition-colors duration-200"
          >
            {title}
          </LocalizedLink>
        </h3>

        {role && (
          <p
            className={`${
              isSmall ? "text-[10px]" : "text-[11px]"
            } text-white/50 font-medium mt-0.5 italic`}
          >
            {truncateRoles(role, t)}
          </p>
        )}
      </div>
    </div>
  );
}
