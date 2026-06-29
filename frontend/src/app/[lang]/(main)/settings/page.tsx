"use client";

import SettingsView from "@/components/profile/SettingsView";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  return (
    <SettingsView user={user} onUserUpdate={setUser} />
  );
}
