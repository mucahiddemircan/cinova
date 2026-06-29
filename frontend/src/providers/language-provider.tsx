"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { TRANSLATIONS, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/i18n";
import { BRAND_NAME } from "@/constants";

interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, unknown>) => any;
  tmdbLanguage: { primary: string; fallback: string | null };
  getLocalizedPath: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const detectLanguage = useCallback((): string => {
    // 1. URL Structure
    if (pathname.startsWith("/tr/") || pathname === "/tr") return "tr";

    // 2. User Preference
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_language");
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;

      // 3. Browser Language
      const browserLang = navigator.language.split("-")[0];
      if (SUPPORTED_LANGUAGES.includes(browserLang)) return browserLang;
    }

    return DEFAULT_LANGUAGE;
  }, [pathname]);

  const language = detectLanguage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (key: string, params: Record<string, unknown> = {}): any => {
      if (!key) return "";
      const keys = key.split(".");
      let value: unknown =
        (TRANSLATIONS as Record<string, unknown>)[language];
      for (const k of keys) {
        if (value === undefined) break;
        value = (value as Record<string, unknown>)[k];
      }
      if (value === undefined || value === null) return key;

      const translationParams = { brand: BRAND_NAME, ...params };

      const processValue = (val: unknown): unknown => {
        if (typeof val === "string") {
          let result = val;
          Object.entries(translationParams).forEach(([k, v]) => {
            result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          });
          return result;
        }
        if (Array.isArray(val)) {
          return val.map((item) => processValue(item));
        }
        if (val && typeof val === "object") {
          const result: Record<string, unknown> = {};
          Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
            result[k] = processValue(v);
          });
          return result;
        }
        return val;
      };

      const processed = processValue(value);
      return typeof processed === "string" || Array.isArray(processed) || (processed && typeof processed === "object") ? processed : key;
    },
    [language]
  );

  const changeLanguage = useCallback(
    (newLang: string) => {
      if (newLang !== language && SUPPORTED_LANGUAGES.includes(newLang)) {
        // Persist for both Client and Middleware
        localStorage.setItem("app_language", newLang);
        document.cookie = `preferred_language=${newLang};path=/;max-age=31536000`; // 1 year

        // Improved path cleaning: Remove any current locale prefix
        let cleanPath = pathname;
        SUPPORTED_LANGUAGES.forEach(loc => {
          if (pathname.startsWith(`/${loc}/`)) {
            cleanPath = pathname.replace(`/${loc}/`, "/");
          } else if (pathname === `/${loc}`) {
            cleanPath = "/";
          }
        });

        // Construct new path
        const newBasePath =
          newLang === "en"
            ? `/en${cleanPath === "/" ? "" : cleanPath}`
            : `/tr${cleanPath === "/" ? "" : cleanPath}`;

        window.location.href = newBasePath;
      }
    },
    [language, pathname]
  );

  const getLocalizedPath = useCallback(
    (path: string): string => {
      if (!path) return path;
      if (path.startsWith("http") || path.startsWith("/tr")) return path;

      if (language === "tr") {
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        return `/tr${cleanPath === "/" ? "" : cleanPath}`;
      }
      return path;
    },
    [language]
  );

  const tmdbLanguage =
    language === "tr"
      ? { primary: "tr-TR", fallback: "en-US" }
      : { primary: "en-US", fallback: null };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        t,
        tmdbLanguage,
        getLocalizedPath,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
