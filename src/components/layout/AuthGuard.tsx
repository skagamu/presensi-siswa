"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isReady) {
      const isLoginPage = pathname.includes("/login");
      
      if (!user && !isLoginPage) {
        router.push("/login");
      }
      if (user && isLoginPage) {
        router.push("/");
      }
    }
  }, [user, isReady, pathname, router]);

  // Tampilkan blank screen sebentar saat mengecek local storage agar tidak kedip
  if (!isReady) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-medium">Memuat Sesi...</div>;
  }

  const isLoginPage = pathname.includes("/login");
  
  if (!user && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
