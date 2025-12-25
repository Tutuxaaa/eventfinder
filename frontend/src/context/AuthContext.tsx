// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, setRuntimeToken, API_BASE } from "../lib/api";

type User = { id: number; email: string; name?: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Функция для установки токена и сохранения в localStorage
  const setAuthToken = (token: string | null) => {
    setRuntimeToken(token);
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }
  };

  // try to initialize from localStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (token) {
          setRuntimeToken(token);
          // fetch profile
          const me = await apiFetch("/auth/me", {}, token);
          setUser(me);
          console.log("AuthContext: User loaded from token:", me);
        } else {
          console.log("AuthContext: No token found");
        }
      } catch (err: any) {
        console.error("AuthContext: Error loading user:", err);
        // token invalid — clear
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    // token endpoint expects form-encoded body
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const tokenResp = await fetch(`${API_BASE}/auth/token`, {
      method: "POST",
      body: params,
    });
    
    if (!tokenResp.ok) {
      const msg = await tokenResp.text().catch(() => "Login failed");
      throw new Error(msg);
    }
    
    const data = await tokenResp.json();
    console.log("AuthContext: Token received:", data);
    
    // Сохраняем токен
    setAuthToken(data.access_token);
    
    // get profile using apiFetch which will read runtime token
    try {
      const me = await apiFetch("/auth/me");
      console.log("AuthContext: User profile loaded:", me);
      setUser(me);
    } catch (err) {
      console.error("AuthContext: Error loading user profile:", err);
      throw new Error("Failed to load user profile");
    }
  }

  async function register(email: string, password: string, name?: string) {
    // create user
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    
    if (!res.ok) {
      const err = await res.text().catch(() => "Register failed");
      throw new Error(err);
    }
    
    // optionally auto-login:
    await login(email, password);
  }

  function logout() {
    console.log("AuthContext: Logging out");
    setAuthToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const me = await apiFetch("/auth/me");
      setUser(me);
    } catch (err) {
      setUser(null);
      setAuthToken(null);
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}