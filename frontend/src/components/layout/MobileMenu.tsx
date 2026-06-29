"use client";

/**
 * Mobile full-screen menu overlay component.
 * Separated from Navbar to conform to the single responsibility principle.
 * Contains category accordions and user transaction links.
 */

import { useState, useEffect, ReactNode } from "react";
import {
  X,
  ChevronDown,
  Check,
  Film,
  Tv,
  User as UserIcon,
  List,
  Globe,
  HelpCircle,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import LocalizedLink from "../common/LocalizedLink";
import Logo from "../common/Logo";
import { MOVIE_CATEGORIES, SERIES_CATEGORIES } from "@/constants";
import type { User } from "@/types";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export default function MobileMenu({
  isOpen,
  onClose,
  user,
  onLogout,
}: MobileMenuProps) {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflowY = "hidden";
      document.body.style.overflowX = "hidden";
      document.documentElement.style.overflowY = "hidden";
      document.documentElement.style.overflowX = "hidden";
    } else {
      document.body.style.removeProperty("overflow-y");
      document.body.style.removeProperty("overflow-x");
      document.documentElement.style.removeProperty("overflow-y");
      document.documentElement.style.removeProperty("overflow-x");
    }
    return () => {
      document.body.style.removeProperty("overflow-y");
      document.body.style.removeProperty("overflow-x");
      document.documentElement.style.removeProperty("overflow-y");
      document.documentElement.style.removeProperty("overflow-x");
    };
  }, [isOpen]);

  const toggleAccordion = (name: string) => {
    setOpenAccordion(openAccordion === name ? null : name);
  };

  const handleAction = (action?: string) => {
    onClose();
    document.body.style.removeProperty("overflow-y");
    document.body.style.removeProperty("overflow-x");
    if (action === "logout") onLogout();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-bg-base transition-all duration-500 flex flex-col ${
        isOpen
          ? "opacity-100 visible translate-x-0"
          : "opacity-0 invisible translate-x-full"
      }`}
    >
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between border-b border-white/5">
        <LocalizedLink
          href="/"
          onClick={onClose}
          className="text-brand text-xl md:text-2xl font-black tracking-wider flex items-center gap-2"
        >
          <Logo className="w-7 h-7" />
          <span>{t("common.brand")}</span>
        </LocalizedLink>

        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-white cursor-pointer"
        >
          <X size={24} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto container mx-auto px-4 py-8 flex flex-col gap-2">
        <CategoryAccordion
          label={t("nav.movies")}
          icon={<Film size={24} />}
          items={MOVIE_CATEGORIES}
          isOpen={openAccordion === "movies"}
          onToggle={() => toggleAccordion("movies")}
          type="movie"
        />

        <CategoryAccordion
          label={t("nav.series")}
          icon={<Tv size={24} />}
          items={SERIES_CATEGORIES}
          isOpen={openAccordion === "series"}
          onToggle={() => toggleAccordion("series")}
          type="series"
        />

        {!user ? (
          <>
            <LocalizedLink
              href="/login"
              onClick={onClose}
              className="w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors flex items-center gap-4"
            >
              <LogIn size={24} />
              {t("nav.login")}
            </LocalizedLink>
            <LocalizedLink
              href="/register"
              onClick={onClose}
              className="w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors flex items-center gap-4"
            >
              <UserPlus size={24} />
              {t("nav.register")}
            </LocalizedLink>
          </>
        ) : (
          <>
            <LocalizedLink
              href={`/${user.username}`}
              onClick={onClose}
              className="w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors flex items-center gap-4"
            >
              <UserIcon size={24} />
              {t("nav.profile")}
            </LocalizedLink>
            <LocalizedLink
              href={`/${user.username}/lists`}
              onClick={onClose}
              className="w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors flex items-center gap-4"
            >
              <List size={24} />
              {t("nav.myLists")}
            </LocalizedLink>
          </>
        )}

        <LanguageAccordion
          isOpen={openAccordion === "language"}
          onToggle={() => toggleAccordion("language")}
        />

        <LocalizedLink
          href="/help"
          onClick={() => handleAction()}
          className="w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors flex items-center gap-4"
        >
          <HelpCircle size={24} />
          {t("nav.help")}
        </LocalizedLink>

        {user && (
          <>
            <LocalizedLink
              href="/settings"
              onClick={onClose}
              className="w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors flex items-center gap-4"
            >
              <Settings size={24} />
              {t("nav.settings")}
            </LocalizedLink>
            <button
              onClick={() => handleAction("logout")}
              className="w-full px-4 py-3 text-left text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center gap-4"
            >
              <LogOut size={24} />
              {t("nav.logout")}
            </button>
          </>
        )}
      </div>

      <div className="p-8 text-center text-text-secondary/50 text-sm">
        &copy; 2026 {t("common.brand")} {t("footer.copyright")}
      </div>
    </div>
  );
}

/**
 * Collapsible category list inside the menu.
 */
interface CategoryAccordionProps {
  label: string;
  icon: ReactNode;
  items: readonly { key: string; path: string }[];
  isOpen: boolean;
  onToggle: () => void;
  type: "movie" | "series";
}

function CategoryAccordion({
  label,
  icon,
  items,
  isOpen,
  onToggle,
  type,
}: CategoryAccordionProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-4">
          {icon}
          {label}
        </div>
        <ChevronDown
          size={24}
          strokeWidth={2.5}
          className={`transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-64 mt-2 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {items.map((cat) => (
          <LocalizedLink
            key={cat.path}
            href={cat.path}
            onClick={onToggle}
            className="w-full px-8 py-3 text-lg text-white hover:bg-white/20 rounded-xl transition-colors block"
          >
            {t(
              `${type === "movie" ? "movieCategories" : "seriesCategories"}.${
                cat.key
              }`
            )}
          </LocalizedLink>
        ))}
      </div>
    </div>
  );
}

/**
 * Language selection accordion inside the menu.
 */
interface LanguageAccordionProps {
  isOpen: boolean;
  onToggle: () => void;
}

function LanguageAccordion({ isOpen, onToggle }: LanguageAccordionProps) {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-2xl font-bold text-white hover:bg-white/20 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-4">
          <Globe size={24} />
          {t("nav.language")}
        </div>
        <ChevronDown
          size={24}
          strokeWidth={2.5}
          className={`transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-32 mt-2 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <button
          onClick={() => {
            setLanguage("tr");
            onToggle();
          }}
          className={`w-full px-8 py-3 text-lg text-white hover:bg-white/20 rounded-xl transition-colors block text-left flex items-center justify-between cursor-pointer ${
            language === "tr" ? "bg-white/10" : ""
          }`}
        >
          Türkçe
          {language === "tr" && <Check size={18} className="text-white" />}
        </button>
        <button
          onClick={() => {
            setLanguage("en");
            onToggle();
          }}
          className={`w-full px-8 py-3 text-lg text-white hover:bg-white/20 rounded-xl transition-colors block text-left flex items-center justify-between cursor-pointer ${
            language === "en" ? "bg-white/10" : ""
          }`}
        >
          English
          {language === "en" && <Check size={18} className="text-white" />}
        </button>
      </div>
    </div>
  );
}
