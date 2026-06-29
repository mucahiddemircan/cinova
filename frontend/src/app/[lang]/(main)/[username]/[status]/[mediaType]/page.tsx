"use client";

import { use } from "react";
import UserListView from "@/components/profile/UserListView";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfileStatusMediaTypePage({
  params,
}: {
  params: Promise<{
    lang: string;
    username: string;
    status: string;
    mediaType: string;
  }>;
}) {
  const { username, status, mediaType } = use(params);
  const currentUser = useAuthStore((s) => s.user);

  // mediaType will be "movies" or "series" from URL
  // UserListView expects statusUrl which it maps to internal status
  return (
    <UserListView
      username={username}
      statusUrl={status}
      currentUser={currentUser}
      mediaType={mediaType}
    />
  );
}
