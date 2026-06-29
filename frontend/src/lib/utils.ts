/**
 * Helper functions used application-wide.
 */

/**
 * Normalizes genre IDs.
 * Supports both string ("28,12,16") and array ([28,12,16]) formats.
 */
export function parseGenreIds(genreIds: number[] | string | null | undefined): number[] {
  if (!genreIds) return [];
  if (Array.isArray(genreIds)) return genreIds;
  if (typeof genreIds === "string") {
    return genreIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")
      .map(Number);
  }
  return [];
}

/**
 * Translates genre ID list to local genre names.
 */
export function resolveGenreNames(
  genreIds: number[] | string | null | undefined,
  resolver: ((id: number, type: string) => string) | ((key: string) => string) | null,
  type = "movie",
  fallback = ""
): string {
  if (!resolver) return fallback;
  const ids = parseGenreIds(genreIds);

  const names = ids
    .map((id) => {
      // 1. Directly resolve by ID (MetadataContext getGenreName)
      const name =
        typeof resolver === "function"
          ? (resolver as (id: number, type: string) => string)(id, type)
          : null;

      if (
        name &&
        typeof name === "string" &&
        !name.startsWith("Genre ") &&
        !name.startsWith("genres.")
      )
        return name;

      // 2. Try as an i18n key
      const fromT =
        typeof resolver === "function"
          ? (resolver as (key: string) => string)(`genres.${id}`)
          : null;

      if (
        fromT &&
        typeof fromT === "string" &&
        !fromT.startsWith("genres.") &&
        !fromT.startsWith("Genre ")
      )
        return fromT;

      return null;
    })
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : fallback;
}

/**
 * Converts date string to relative format (e.g., "3 hours ago", "2 days ago").
 */
export function formatTimeAgo(
  dateStr: string | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  if (!dateStr || !t) return "";

  let date: Date;
  try {
    if (
      typeof dateStr === "string" &&
      !dateStr.includes("Z") &&
      !dateStr.includes("+")
    ) {
      const isoStr = dateStr.replace(" ", "T") + "Z";
      date = new Date(isoStr);
    } else {
      date = new Date(dateStr);
    }
  } catch {
    return "";
  }

  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 0) return t("notifications.time.now");

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0)
    return years === 1
      ? t("notifications.time.yearAgo")
      : t("notifications.time.yearsAgo", { n: years });
  if (months > 0)
    return months === 1
      ? t("notifications.time.monthAgo")
      : t("notifications.time.monthsAgo", { n: months });
  if (days > 0)
    return days === 1
      ? t("notifications.time.dayAgo")
      : t("notifications.time.daysAgo", { n: days });
  if (hours > 0)
    return hours === 1
      ? t("notifications.time.hourAgo")
      : t("notifications.time.hoursAgo", { n: hours });
  if (minutes > 0)
    return minutes === 1
      ? t("notifications.time.minuteAgo")
      : t("notifications.time.minutesAgo", { n: minutes });
  return t("notifications.time.now");
}

/**
 * Calculates person's age from birth date.
 */
export function calculateAge(
  birthday: string | null,
  deathday: string | null = null
): number | null {
  if (!birthday) return null;

  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && end.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

/**
 * Converts date string to local format.
 */
export function formatDate(
  dateStr: string | null | undefined,
  language = "tr"
): string | null {
  if (!dateStr) return null;
  const locale = language === "tr" ? "tr-TR" : "en-US";
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Shortens role list after a specified number with "+X more...".
 */
export function truncateRoles(
  roleStr: string | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
  limit = 3
): string {
  if (!roleStr) return "";

  const roles = roleStr
    .split(" / ")
    .map((r) => r.trim())
    .filter(Boolean);

  if (roles.length <= limit) return roleStr;

  const shownRoles = roles.slice(0, limit).join(" / ");
  const remainingCount = roles.length - limit;

  return `${shownRoles} +${t("common.moreCount", { count: remainingCount })}`;
}
