/**
 * Uygulama genelinde kullanılan yardımcı fonksiyonlar.
 *
 * genre_ids çözümleme, tür ismi eşleme ve tarih formatlama gibi
 * birden çok bileşende tekrarlanan işlemleri merkezileştirir.
 */

/**
 * Genre ID'lerini normalize eder.
 * Hem string ("28,12,16") hem array ([28,12,16]) formatını destekler.
 * Veritabanından gelen virgülle ayrılmış string verileri dizi'ye çevirir.
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
 * Genre ID listesini yerel tür adlarına çevirir.
 */
export function resolveGenreNames(genreIds, resolver, type = "movie", fallback = "") {
    if (!resolver) return fallback;
    const ids = parseGenreIds(genreIds);
    
    const names = ids.map((id) => {
        // 1. Önce doğrudan ID ile çözümlemeyi dene (MetadataContext getGenreName için)
        // Metadata fonksiyonu (id, type) bekler.
        const name = typeof resolver === "function" ? resolver(id, type) : null;
        
        // Eğer geçerli bir isimse (fallback değilse) döndür.
        // Metadata fallback'i "Genre " ile başlar.
        if (name && typeof name === 'string' && !name.startsWith("Genre ") && !name.startsWith("genres.")) return name;
        
        // 2. Eğer yukarıdaki başarısız olduysa, i18n key'i olarak dene (Static translations için)
        // i18n (t) fonksiyonu "genres.id" formatında key bekler.
        const fromT = typeof resolver === "function" ? resolver(`genres.${id}`) : null;
        
        // Eğer i18n'den geçerli bir sonuç geldiyse (key'in kendisi veya Genre fallback'i değilse) döndür.
        if (fromT && typeof fromT === 'string' && !fromT.startsWith("genres.") && !fromT.startsWith("Genre ")) return fromT;
        
        return null;
    }).filter(Boolean);

    return names.length > 0 ? names.join(", ") : fallback;
}

/**
 * Tarih stringini göreli formata çevirir (ör: "3 saat önce", "2 gün önce").
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
 * Kişinin yaşını doğum tarihinden hesaplar.
 * Ölüm tarihi verildiyse o tarihteki yaşı döndürür.
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
 * Tarih stringini yerel formata çevirir.
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
 * Rol listesini belirtilen sayıdan sonrasını "+X daha..." şeklinde kısaltır.
 */
export function truncateRoles(roleStr, t, limit = 3) {
    if (!roleStr) return "";
    
    const roles = roleStr.split(" / ").map(r => r.trim()).filter(Boolean);
    
    if (roles.length <= limit) return roleStr;

    const shownRoles = roles.slice(0, limit).join(" / ");
    const remainingCount = roles.length - limit;
    
    return `${shownRoles} +${t("common.moreCount", { count: remainingCount })}`;
}

