"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  useAuthGetCurrentUser,
  setAccessToken,
  clearAccessToken,
  type UserResponseDto,
} from "@repo/queries";

type AuthUser = UserResponseDto;
type LoginPayload = { email: string; password: string };

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { refetch: refetchMe } = useAuthGetCurrentUser({
    query: { enabled: false, retry: false },
  });

  const syncCurrentUser = useCallback(async () => {
    const result = await refetchMe();
    const me = result.data;
    if (!me) {
      throw new Error("Failed to fetch current user");
    }
    setUser(me);
  }, [refetchMe]);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        clearAccessToken();
        setUser(null);
        return false;
      }
      const data = (await response.json()) as { access_token?: string };
      if (!data.access_token) {
        clearAccessToken();
        setUser(null);
        return false;
      }
      setAccessToken(data.access_token);
      await syncCurrentUser();
      return true;
    } catch {
      clearAccessToken();
      setUser(null);
      return false;
    }
  }, [syncCurrentUser]);

  const login = useCallback(
    async ({ email, password }: LoginPayload) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Login failed");
      }
      const data = (await response.json()) as { access_token?: string };
      if (!data.access_token) {
        throw new Error("Missing access token");
      }
      setAccessToken(data.access_token);
      await syncCurrentUser();
    },
    [syncCurrentUser],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      clearAccessToken();
      setUser(null);
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setIsLoading(true);
      await refreshSession();
      if (active) {
        setIsLoading(false);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [isLoading, login, logout, refreshSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
