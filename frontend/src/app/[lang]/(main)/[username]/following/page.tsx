"use client";

import { use } from "react";
import FollowsListView from "@/components/profile/FollowsListView";

import { useAuthStore } from "@/stores/auth-store";

export default function FollowingPage({
  params,
}: {
  params: Promise<{ lang: string; username: string }>;
}) {
  const { username } = use(params);
  const user = useAuthStore((s) => s.user);

  return <FollowsListView username={username} type="following" user={user} />;
}
