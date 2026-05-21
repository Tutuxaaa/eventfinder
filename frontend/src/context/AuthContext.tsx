import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api";
import { clearStoredAuth, getRefreshToken, setRuntimeTokenPair } from "../lib/api";
import type { UserDto, UserRole } from "../types";

type AuthContextType = {
  user: UserDto | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        clearStoredAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const tokenPair = await authApi.login(email, password);
    setRuntimeTokenPair(tokenPair.access_token, tokenPair.refresh_token);
    const me = await authApi.me();
    setUser(me);
  }

  async function register(email: string, password: string, name?: string) {
    await authApi.register({ email, password, name });
    await login(email, password);
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // ignore logout network errors and clear local state anyway
    } finally {
      clearStoredAuth();
      setUser(null);
    }
  }

  async function refreshUser() {
    const me = await authApi.me();
    setUser(me);
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      hasRole: (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
