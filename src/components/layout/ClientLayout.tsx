"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/AuthContext";
import { LogOut, Clock, CalendarDays } from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isLoginPage = pathname ? pathname.includes("/login") : false;

  const [timeStr, setTimeStr] = useState({ dateFull: "", dateShort: "", time: "" });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateFull = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now);

      const dateShort = new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short"
      }).format(now);

      const time = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).replace(".", ":");

      setTimeStr({ dateFull, dateShort, time });
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoginPage) {
    return <main className="flex-1 w-full h-screen overflow-y-auto">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-44 md:pb-0 bg-gray-50/80">
        {user && (
          <div className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 md:px-8 backdrop-blur">
            
            {/* MOBILE: SISI KIRI (LOGO & NAMA) */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-950 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">BK</span>
              </div>
              <span className="text-sm font-bold text-gray-950">Sistem BK</span>
            </div>

            {/* DESKTOP: SISI KIRI / TENGAH (TANGGAL LENGKAP & JAM) */}
            <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md shadow-inner">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                <span>{timeStr.dateFull || "..."}</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{timeStr.time || "..."} WIB</span>
              </div>
            </div>

            {/* SISI KANAN */}
            <div className="flex items-center gap-2">
              {/* MOBILE SISI KANAN: JAM & TANGGAL RINGKAS (MENGGANTIKAN LOGOUT) */}
              <div className="md:hidden flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 bg-gray-100 border border-gray-200/80 px-2.5 py-1 rounded-md">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>{timeStr.dateShort ? `${timeStr.dateShort}, ${timeStr.time}` : "..."}</span>
              </div>

              {/* DESKTOP SISI KANAN: USER PROFILE & LOGOUT BUTTON */}
              <button 
                onClick={logout}
                className="hidden md:flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <span className="max-w-[180px] truncate">{user.nama}</span>
                <LogOut className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>

          </div>
        )}
        <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </>
  );
}
