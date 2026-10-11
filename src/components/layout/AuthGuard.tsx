"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname ? pathname === "/login" : false;


  useEffect(() => {
    if (isReady) {
      if (!user && !isLoginPage) {
        router.replace("/login");
      }
      if (user && isLoginPage) {
        router.replace("/");
      }
    }
  }, [user, isReady, isLoginPage, router]);


  if (!isReady) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-medium">Memuat Sesi...</div>;
  }

  if (!user && !isLoginPage) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-medium">Mengalihkan ke Login...</div>;
  }

  return <>{children}</>;
}
