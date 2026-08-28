import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Presensi BK | Square UI",
  description: "Aplikasi Khusus Guru BK (Square UI Theme)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-gray-50/50 flex min-h-screen overflow-hidden`}>
        {/* SIDEBAR / BOTTOM BAR */}
        <Sidebar />
        
        {/* KONTEN UTAMA */}
        {/* Tambahkan pb-20 (padding bottom) untuk mobile agar konten paling bawah tidak tertutup Bottom Bar */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto pb-20 md:pb-0">
          <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
        
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
