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
          <div className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between md:justify-end border-b border-gray-200 bg-white/90 px-4 md:px-8 backdrop-blur">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-950 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">BK</span>
              </div>
              <span className="text-sm font-bold text-gray-950">Sistem BK</span>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className="max-w-[110px] sm:max-w-[160px] md:max-w-[180px] truncate">{user.nama}</span>
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
