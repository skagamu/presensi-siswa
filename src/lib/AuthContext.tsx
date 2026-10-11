"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { gasPost } from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  nama: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onExpired = () => {
      setUser(null); setToken(null);
      localStorage.removeItem("bk_auth_token"); localStorage.removeItem("bk_auth_user");
      toast.error("Sesi berakhir. Silakan login kembali.");
    };
    window.addEventListener("bk-session-expired", onExpired);
    try {
      const savedToken = localStorage.getItem("bk_auth_token");
      const savedUser = localStorage.getItem("bk_auth_user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsReady(true);
    }
    return () => window.removeEventListener("bk-session-expired", onExpired);
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("bk_auth_token", newToken);
    localStorage.setItem("bk_auth_user", JSON.stringify(userData));
    router.replace("/");
  };

  const logout = () => {
    void gasPost("logout").catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem("bk_auth_token");
    localStorage.removeItem("bk_auth_user");
    toast.info("Anda telah keluar.");
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
