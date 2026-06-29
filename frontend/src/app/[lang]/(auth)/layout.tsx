"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { BRAND_NAME } from "@/constants";
import Logo from "@/components/common/Logo";
import Footer from "@/components/layout/Footer";
import { useAuthStore, type AuthState } from "@/stores/auth-store";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s: AuthState) => s.user);

  return (
    <div className="min-h-screen flex flex-col bg-bg-base relative">
      <header className="w-full z-50 p-6 md:px-12 flex justify-between items-center mb-8">
        <Link
          href="/"
          className="text-brand text-2xl font-black tracking-wider flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Logo className="w-8 h-8" />
          <span>{BRAND_NAME}</span>
        </Link>
      </header>
      <main className="flex-grow flex items-center justify-center px-4 w-full mb-12">
        <div className="w-full max-w-lg lg:max-w-xl">{children}</div>
      </main>
      <div className="mt-auto w-full text-center">
        <div className="container mx-auto px-4">
          <Footer user={user} />
        </div>
      </div>
    </div>
  );
}
