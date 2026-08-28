import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { ClientLayout } from "@/components/layout/ClientLayout"; 

export const metadata: Metadata = {
  title: "Sistem Manajemen BK",
  description: "Sistem Informasi Presensi dan Pelanggaran Kedisiplinan Siswa",
  manifest: "/presensi-siswa/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sistem BK",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="/presensi-siswa/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-gray-50/50 flex min-h-screen overflow-hidden`}>
        <AuthProvider>
          <AuthGuard>
            <ClientLayout>{children}</ClientLayout>
          </AuthGuard>
        </AuthProvider>
        <Toaster position="top-center" />
        
        {/* Clear old PWA cache that can serve stale GitHub Pages bundles. */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  registrations.forEach(function(registration) { registration.unregister(); });
                });
              });
            }
            if ('caches' in window) {
              caches.keys().then(function(keys) {
                keys.forEach(function(key) { caches.delete(key); });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
