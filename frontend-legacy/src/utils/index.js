/**
 * Helper functions used application-wide.
 *
 * Centralizes operations repeated in multiple components
 * such as genre_ids resolution, genre name mapping and date formatting.
 */

/**
 * Normalizes genre IDs.
 * Supports both string ("28,12,16") and array ([28,12,16]) formats.
 * Converts comma-separated string data from database into array.
 */
export function parseGenreIds(genreIds) {
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
export function resolveGenreNames(genreIds, resolver, type = "movie", fallback = "") {
    if (!resolver) return fallback;
    const ids = parseGenreIds(genreIds);
    
    const names = ids.map((id) => {
        // 1. First try direct resolution by ID (for MetadataContext getGenreName)
        // Metadata function expects (id, type).
        const name = typeof resolver === "function" ? resolver(id, type) : null;
        
        // If a valid name (not fallback), return.
        // Metadata fallback starts with "Genre ".
        if (name && typeof name === 'string' && !name.startsWith("Genre ") && !name.startsWith("genres.")) return name;
        
        // 2. If above failed, try as an i18n key (for static translations)
        // i18n (t) function expects key in format "genres.id".
        const fromT = typeof resolver === "function" ? resolver(`genres.${id}`) : null;
        
        // If a valid result returned from i18n (not the key itself or Genre fallback), return.
        if (fromT && typeof fromT === 'string' && !fromT.startsWith("genres.") && !fromT.startsWith("Genre ")) return fromT;
        
        return null;
    }).filter(Boolean);

    return names.length > 0 ? names.join(", ") : fallback;
}

/**
 * Converts date string to relative format (e.g., "3 hours ago", "2 days ago").
 */
export function formatTimeAgo(dateStr, t) {
    if (!dateStr || !t) return "";

    let date;
    try {
        if (typeof dateStr === "string" && !dateStr.includes("Z") && !dateStr.includes("+")) {
            const isoStr = dateStr.replace(" ", "T") + "Z";
            date = new Date(isoStr);
        } else {
            date = new Date(dateStr);
        }
    } catch (e) {
        return "";
    }

    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now - date;

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 0) return t("notifications.time.now");
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return years === 1 ? t("notifications.time.yearAgo") : t("notifications.time.yearsAgo", { n: years });
    if (months > 0) return months === 1 ? t("notifications.time.monthAgo") : t("notifications.time.monthsAgo", { n: months });
    if (days > 0) return days === 1 ? t("notifications.time.dayAgo") : t("notifications.time.daysAgo", { n: days });
    if (hours > 0) return hours === 1 ? t("notifications.time.hourAgo") : t("notifications.time.hoursAgo", { n: hours });
    if (minutes > 0) return minutes === 1 ? t("notifications.time.minuteAgo") : t("notifications.time.minutesAgo", { n: minutes });
    return t("notifications.time.now");
}

/**
 * Calculates person's age from birth date.
 * If date of death is given, returns age at that date.
 */
export function calculateAge(birthday, deathday = null) {
    if (!birthday) return null;

    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

/**
 * Converts date string to local format.
 */
export function formatDate(dateStr, language = 'tr') {
    if (!dateStr) return null;
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/**
 * Shortens role list after a specified number with "+X more...".
 */
export function truncateRoles(roleStr, t, limit = 3) {
    if (!roleStr) return "";
    
    const roles = roleStr.split(" / ").map(r => r.trim()).filter(Boolean);
    
    if (roles.length <= limit) return roleStr;

    const shownRoles = roles.slice(0, limit).join(" / ");
    const remainingCount = roles.length - limit;
    
    return `${shownRoles} +${t("common.moreCount", { count: remainingCount })}`;
}

