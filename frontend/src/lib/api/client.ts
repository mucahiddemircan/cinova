/**
 * Type-safe API fetch wrapper.
 *
 * Authorizes requests with in-memory JWT token.
 * Passes language info to backend via Accept-Language header.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── In-Memory Token ────────────────────────────────────────────────

let _accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => _accessToken;

// ─── API Error ──────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── Request Function ───────────────────────────────────────────────

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = _accessToken;

  // Forward user's selected language to backend
  const appLanguage =
    typeof window !== "undefined"
      ? localStorage.getItem("app_language") || "en"
      : "en";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": appLanguage,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config: RequestInit = {
    headers,
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth-unauthorized"));
    }
    throw new ApiError(
      data.detail || "Bir hata oluştu",
      response.status,
      data
    );
  }

  return data as T;
}
