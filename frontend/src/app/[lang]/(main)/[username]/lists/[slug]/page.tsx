"use client";

import { use } from "react";
import CustomListView from "@/components/profile/CustomListView";
import { useAuthStore } from "@/stores/auth-store";

export default function CustomListDetailsPage({
  params,
}: {
  params: Promise<{ lang: string; username: string; slug: string }>;
}) {
  const { username, slug } = use(params);
  const currentUser = useAuthStore((s) => s.user);

  return (
    <CustomListView
      username={username}
      slug={slug}
      currentUser={currentUser}
    />
  );
}
