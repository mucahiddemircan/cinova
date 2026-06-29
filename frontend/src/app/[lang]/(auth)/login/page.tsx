"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Login from "@/components/auth/Login";
import { useAuthStore, type AuthState } from "@/stores/auth-store";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s: AuthState) => s.user);
  const setUser = useAuthStore((s: AuthState) => s.setUser);

  useEffect(() => {
    if (user) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Zaten oturum açtınız" })
      );
      router.replace("/");
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      router.push("/");
    } catch (err) {
      console.error("Giriş sonrası profil çekme hatası:", err);
    }
  };

  return <Login onLogin={handleLogin} />;
}
