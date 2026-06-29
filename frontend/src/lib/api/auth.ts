import { supabase } from "@/lib/supabase";
import { request } from "./client";
import type { User, CompleteProfileData } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  register: (
    email: string,
    password: string,
    metadata: Record<string, string>
  ) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    }),

  loginWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : "",
      },
    }),

  logout: () => supabase.auth.signOut(),

  getMe: () => request<User>("/me"),

  checkUsername: (username: string) =>
    request<{ available: boolean }>(
      `/auth/check-username?username=${encodeURIComponent(username)}`
    ),

  checkEmail: (email: string) =>
    request<{ available: boolean }>(
      `/auth/check-email?email=${encodeURIComponent(email)}`
    ),

  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/settings`
          : "",
    }),

  updatePassword: (newPassword: string) =>
    supabase.auth.updateUser({ password: newPassword }),

  updateEmail: (newEmail: string) =>
    supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/settings` : "" }
    ),

  completeProfile: (data: CompleteProfileData) =>
    request<User>("/me/complete-profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resendConfirmation: (email: string) =>
    supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : "",
      },
    }),

  refreshSession: () => supabase.auth.refreshSession(),
};
