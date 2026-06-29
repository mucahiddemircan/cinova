"use client";

import { AlertCircle, type LucideIcon } from "lucide-react";
import LocalizedLink from "./LocalizedLink";

interface ErrorStateProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  buttonText: string;
  buttonLink?: string;
  errorCode?: string | number;
}

/**
 * General purpose error and status screen component.
 * Standardizes error pages with glassmorphism design and minimalist approach.
 */
export default function ErrorState({
  title,
  subtitle,
  icon: Icon = AlertCircle,
  buttonText,
  buttonLink = "/",
  errorCode,
}: ErrorStateProps) {
  return (
    <>
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
        <div className="bg-bg-surface/30 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center max-w-md w-full shadow-2xl relative">
          <div className="mb-8 relative z-10">
            <Icon className="text-text-secondary" size={64} strokeWidth={1.5} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            {errorCode ? `${errorCode} - ` : ""}
            {title}
          </h2>

          {subtitle && (
            <p className="text-text-secondary text-sm mb-10 leading-relaxed opacity-70">
              {subtitle}
            </p>
          )}

          <LocalizedLink
            href={buttonLink}
            className="w-full block bg-brand hover:bg-brand-hover text-white py-4 px-8 rounded-2xl font-bold transition-all shadow-lg shadow-brand/20 active:scale-[0.98] text-center"
          >
            {buttonText}
          </LocalizedLink>
        </div>
      </div>
      <div className="h-32" />
    </>
  );
}
