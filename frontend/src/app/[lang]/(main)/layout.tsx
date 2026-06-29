"use client";

import { type ReactNode } from "react";
import { CertificationProvider } from "@/providers/certification-provider";
import { MetadataProvider } from "@/providers/metadata-provider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNavigation from "@/components/layout/BottomNavigation";
import BottomStickyCTA from "@/components/layout/BottomStickyCTA";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function MainLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <CertificationProvider>
      <MetadataProvider>
        <div
          className={`min-h-screen flex flex-col ${!user ? "md:pb-28" : ""} pb-20 md:pb-0 transition-all pt-16 md:pt-20`}
        >
          <Navbar user={user} onLogout={handleLogout} />
          <div className="flex-grow container mx-auto px-6 pt-3 pb-8">
            <main className="flex-1 min-w-0 flex flex-col min-h-full">
              <div className="flex-grow">{children}</div>
              <Footer user={user} />
            </main>
            {!user && <BottomStickyCTA />}
            <BottomNavigation user={user} />
          </div>
        </div>
      </MetadataProvider>
    </CertificationProvider>
  );
}
