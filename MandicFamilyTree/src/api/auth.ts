import { apiRequest } from "./client";

export type UserRole = "admin" | "editor" | "viewer";

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  linkedPersonId: number | null;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export function signup(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: { email, password, displayName },
  });
}

export function fetchMe(token: string): Promise<{ user: AuthUser }> {
  return apiRequest<{ user: AuthUser }>("/auth/me", { token });
}
