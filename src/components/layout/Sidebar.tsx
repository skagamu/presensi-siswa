"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, Archive, FileWarning, ListTodo } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

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
