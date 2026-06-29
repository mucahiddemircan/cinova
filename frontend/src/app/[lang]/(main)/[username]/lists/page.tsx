"use client";

import { use } from "react";
import UserCustomListsView from "@/components/profile/UserCustomListsView";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfileListsPage({
  params,
}: {
  params: Promise<{ lang: string; username: string }>;
}) {
  const { username } = use(params);
  const currentUser = useAuthStore((s) => s.user);

  return (
    <UserCustomListsView username={username} currentUser={currentUser} />
  );
}
