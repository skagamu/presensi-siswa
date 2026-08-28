"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, Archive, FileWarning, ListTodo } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Dashboard", href: "/presensi-siswa", icon: LayoutDashboard },
    { name: "Semua Alert", href: "/presensi-siswa/semua-alert", icon: ListTodo },
    { name: "Presensi", href: "/presensi-siswa/presensi", icon: Users },
    { name: "Bank Kasus", href: "/presensi-siswa/bank-kasus", icon: FileWarning },
    { name: "Daftar Kasus", href: "/presensi-siswa/daftar-kasus", icon: ListTodo },
    { name: "Rekap", href: "/presensi-siswa/rekap", icon: CalendarDays },
    { name: "Riwayat", href: "/presensi-siswa/riwayat", icon: Archive },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex sticky top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 flex-col">
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="font-bold text-xl flex items-center gap-2 text-primary">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">BK</span>
            </div>
            <span>Sistem BK</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Menu Utama
          </p>
          
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                  ${isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-400"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER INFO */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-900">Guru BK Mode</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Akses Khusus Admin</p>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe overflow-x-auto scrollbar-hide">
        <nav className="flex items-center h-16 min-w-[360px]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className="flex flex-col items-center justify-center flex-1 px-2 space-y-1"
              >
                <div className={`p-1 rounded-full ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-500"}`} />
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${isActive ? "text-primary" : "text-gray-500"}`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
