"use client";

import { Bookmark } from "lucide-react";
import LocalizedLink from "../common/LocalizedLink";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-surface w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-white/5 animate-slide-up sm:animate-zoom-in">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center text-brand">
            <Bookmark size={32} strokeWidth={2.5} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white leading-tight">
              Listelerine eklemek için oturum açmalısın.
            </h3>
            <p className="text-text-secondary text-sm">
              Favori içeriklerini takip etmek ve kendi listelerini oluşturmak
              için oturum aç.
            </p>
          </div>

          <div className="flex flex-col w-full gap-3 mt-2">
            <LocalizedLink
              href="/login"
              onClick={onClose}
              className="w-full block bg-brand hover:bg-brand-hover text-white py-4 rounded-full font-bold text-center transition-all shadow-lg shadow-brand/20 active:scale-[0.98]"
            >
              Oturum aç
            </LocalizedLink>
            <button
              onClick={onClose}
              className="w-full py-4 text-text-secondary font-bold hover:text-white transition-colors cursor-pointer"
            >
              Şimdi değil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
