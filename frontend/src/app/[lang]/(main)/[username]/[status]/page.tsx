"use client";

import { use } from "react";
import UserMixedListView from "@/components/profile/UserMixedListView";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfileStatusPage({
  params,
}: {
  params: Promise<{ lang: string; username: string; status: string }>;
}) {
  const { username, status } = use(params);
  const currentUser = useAuthStore((s) => s.user);

  return (
    <UserMixedListView
      username={username}
      statusUrl={status}
      currentUser={currentUser}
    />
  );
}
