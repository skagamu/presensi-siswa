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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-20 md:pb-0 relative">
        {/* Tombol Logout Global di Kanan Atas */}
        {user && (
          <div className="absolute top-4 right-4 md:top-6 md:right-8 z-50">
            <button 
              onClick={logout}
              className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm text-red-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        )}
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </>
  );
}
