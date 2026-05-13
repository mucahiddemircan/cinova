/**
 * Uygulama genelinde kullanılan sabit değerler.
 *
 * İzleme listesi durumları, navigasyon rotaları ve sıralama tercihleri
 * gibi mantıksal değerler burada tutulur.
 * 
 * NOT: Görüntülenecek metinler (etiketler, tür adları, departmanlar vb.) 
 * i18n sistemi (src/i18n) veya MetadataContext üzerinden dinamik olarak 
 * yönetilmektedir.
 */

// İzleme listesi durumları (Mantıksal ID'ler)
export const WATCHLIST_STATUSES = {
    WATCHLIST: "watchlist",
    WATCHED: "watched",
};

// Marka ismi (LanguageContext üzerinden i18n parametrelerine enjekte edilir)
export const BRAND_NAME = "ABCDEFGH";

// Profil sayfasındaki listelerin gösterim sırası
export const STATUS_ORDER = [
    "watchlist",
    "watched",
];

// URL slug → durum eşlemesi (rota parametresi çözümleme)
export const URL_TO_STATUS = {
    "watchlist": "watchlist",
    "watched": "watched",
    "likes": "like",
    "dislikes": "dislike",
};

// Durum → URL slug eşlemesi (link oluşturma)
export const STATUS_SLUGS = {
    "watchlist": "watchlist",
    "watched": "watched",
    "like": "likes",
    "dislike": "dislikes",
};

// Navbar ve keşif sayfasında kullanılan kategori navigasyonları
// 'name' özellikleri artık i18n üzerinden t() ile çekildiği için kaldırıldı.
export const MOVIE_CATEGORIES = [
    { key: "popular", path: "/movies/popular" },
    { key: "nowPlaying", path: "/movies/now-playing" },
    { key: "upcoming", path: "/movies/upcoming" },
    { key: "topRated", path: "/movies/top-rated" },
];

export const SERIES_CATEGORIES = [
    { key: "popular", path: "/series/popular" },
    { key: "onTheAir", path: "/series/on-the-air" },
    { key: "topRated", path: "/series/top-rated" },
];

