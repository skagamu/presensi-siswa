"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isLoginPage = pathname.includes("/login");

  if (isLoginPage) {
    return <main className="flex-1 w-full h-screen overflow-y-auto">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-20 md:pb-0 bg-gray-50/80">
        {user && (
          <div className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-end border-b border-gray-200 bg-white/90 px-8 backdrop-blur">
            <button 
              onClick={logout}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className="max-w-[180px] truncate">{user.nama}</span>
              <LogOut className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        )}
        <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </>
  );
}
