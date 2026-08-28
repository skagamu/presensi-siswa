"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, LayoutDashboard, Users, CalendarDays, FileWarning, ListTodo, MoreHorizontal, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const groups = [
    { label: "Utama", links: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Presensi", href: "/presensi", icon: Users },
    ]},
    { label: "Kasus BK", links: [
      { name: "Semua Alert", href: "/semua-alert", icon: ListTodo },
      { name: "Bank Kasus", href: "/bank-kasus", icon: FileWarning },
      { name: "Daftar Kasus", href: "/daftar-kasus", icon: ListTodo },
    ]},
    { label: "Laporan", links: [
      { name: "Rekap", href: "/rekap", icon: CalendarDays },
      { name: "Riwayat", href: "/riwayat", icon: Archive },
    ]},
  ];
  const navLinks = groups.flatMap((group) => group.links);
  const mobileLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Presensi", href: "/presensi", icon: Users },
    { name: "Alert", href: "/semua-alert", icon: ListTodo },
    { name: "Rekap", href: "/rekap", icon: CalendarDays },
    { name: "Lainnya", href: "#", icon: MoreHorizontal },
  ];
  const moreLinks = [
    { name: "Bank Kasus", href: "/bank-kasus", icon: FileWarning },
    { name: "Daftar Kasus", href: "/daftar-kasus", icon: ListTodo },
    { name: "Riwayat", href: "/riwayat", icon: Archive },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex sticky top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 flex-col">
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="font-bold text-lg flex items-center gap-2 text-gray-950">
            <div className="w-8 h-8 bg-gray-950 rounded-md flex items-center justify-center">
              <span className="text-white text-sm">BK</span>
            </div>
            <span>Sistem BK</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
              {group.links.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-gray-950 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"}`}>
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* FOOTER INFO */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-900">Guru BK Mode</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Akses Khusus Admin</p>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {isMoreOpen && (
        <button
          type="button"
          aria-label="Tutup menu lainnya"
          className="md:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setIsMoreOpen(false)}
        />
      )}
      {isMoreOpen && (
        <div className="md:hidden fixed bottom-20 left-3 right-3 z-50 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu Lainnya</div>
          {moreLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMoreOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${isActive ? "bg-gray-950 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                {link.name}
              </Link>
            );
          })}
          {user && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="px-3 py-1.5 text-xs text-gray-500">
                Masuk sebagai: <span className="font-semibold text-gray-900">{user.nama}</span>
              </div>
              <button
                type="button"
                onClick={() => { setIsMoreOpen(false); logout(); }}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 text-red-600" />
                Keluar (Logout)
              </button>
            </div>
          )}
        </div>
      )}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur">
        <nav className="grid h-16 grid-cols-5 px-1">
          {mobileLinks.map((link) => {
            const isActive = pathname === link.href || (link.name === "Lainnya" && ["/bank-kasus", "/daftar-kasus", "/riwayat"].includes(pathname));
            const Icon = link.icon;
            if (link.name === "Lainnya") {
              return (
                <button key={link.name} type="button" onClick={() => setIsMoreOpen((value) => !value)} className="flex flex-col items-center justify-center gap-1 px-1">
                  <div className={`flex h-7 w-10 items-center justify-center rounded-md ${isActive || isMoreOpen ? 'bg-gray-950' : ''}`}>
                    <Icon className={`w-4 h-4 ${isActive || isMoreOpen ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${isActive || isMoreOpen ? "text-gray-950" : "text-gray-500"}`}>Lainnya</span>
                </button>
              );
            }
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className="flex flex-col items-center justify-center gap-1 px-1"
              >
                <div className={`flex h-7 w-10 items-center justify-center rounded-md ${isActive ? 'bg-gray-950' : ''}`}>
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-gray-950" : "text-gray-500"}`}>
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
