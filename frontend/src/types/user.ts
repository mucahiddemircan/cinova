// ─── User / Profile ─────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio?: string;
  is_complete: boolean;
  created_at: string;
  provider?: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio?: string;
  created_at: string;
}

export interface CompleteProfileData {
  username: string;
  full_name: string;
}

// ─── Account ────────────────────────────────────────────────────────

export interface AccountStatus {
  has_password: boolean;
  has_google: boolean;
  email: string;
  provider: string;
  auth_provider?: string;
  username_changed_at?: string | null;
}
