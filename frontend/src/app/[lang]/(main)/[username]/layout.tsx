"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { useAuthStore } from "@/stores/auth-store";

export default function UserProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string; username: string }>;
}) {
  const { lang, username } = use(params);
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  
  const shouldWrap = (() => {
    if (segments.length <= 2) return true;
    if (segments.length === 3) {
      const subpage = segments[2];
      if (subpage === "followers" || subpage === "following") {
        return false;
      }
      return true;
    }
    return false;
  })();

  if (!shouldWrap) {
    return <>{children}</>;
  }

  return (
    <ProfileLayout user={user} username={username}>
      {children}
    </ProfileLayout>
  );
}
