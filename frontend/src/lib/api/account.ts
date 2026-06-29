import { request } from "./client";
import type { AccountStatus } from "@/types";

export const accountApi = {
  getStatus: () => request<AccountStatus>("/account/status"),

  setPassword: (newPassword: string) =>
    request<{ success: boolean }>("/account/set-password", {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>("/account/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),

  changeEmail: (
    newEmail: string,
    currentPassword: string | null = null,
    newPassword: string | null = null
  ) =>
    request<{ success: boolean }>("/account/change-email", {
      method: "POST",
      body: JSON.stringify({
        new_email: newEmail,
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),

  changeUsername: (newUsername: string, currentPassword: string | null = null) =>
    request<{ success: boolean }>("/account/change-username", {
      method: "POST",
      body: JSON.stringify({
        new_username: newUsername,
        current_password: currentPassword,
      }),
    }),

  unlinkGoogle: () =>
    request<{ success: boolean }>("/account/unlink-google", {
      method: "POST",
    }),

  updateAvatar: (avatarUrl: string) =>
    request<{ success: boolean }>("/account/avatar", {
      method: "PATCH",
      body: JSON.stringify({ avatar_url: avatarUrl }),
    }),
};
