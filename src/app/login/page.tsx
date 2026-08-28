"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { fetchGasApi } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Isi username dan password.");

    setIsLoading(true);
    try {
      const res = await fetchGasApi("login", { username: username.trim().toLowerCase(), password });
      
      if (res.status === "success") {
        const { token, user } = res.data;
        toast.success(`Selamat datang, ${user.nama}!`);
        login(token, user);
        setTimeout(() => { window.location.href = "/presensi-siswa/"; }, 300);
      } else {
        toast.error(res.message || "Login gagal.");
      }
    } catch (err) {
      toast.error("Tidak dapat terhubung ke server. Periksa koneksi internet.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f3f4f6] flex items-center justify-center p-3 sm:p-6 md:p-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* LEFT PANE: LOGO & BRANDING */}
        <div className="lg:col-span-5 bg-[#f8fafc] border-b lg:border-b-0 lg:border-r border-gray-100 p-8 sm:p-10 flex flex-col justify-between items-center text-center">
          {/* HEADER TAG */}
          <div className="w-full flex items-center justify-center">
            <span className="text-xs font-black tracking-widest text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              SMK Gajah Mungkur 1
            </span>
          </div>

          {/* SCHOOL LOGO */}
          <div className="my-6 lg:my-0 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 drop-shadow-md transition-transform hover:scale-105 duration-300">
              <img 
                src="/presensi-siswa/logo-skagamu.png" 
                alt="Logo SMK Gajah Mungkur 1 Wuryantoro" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="mt-5 text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              SISTEM INFORMASI BK
            </h2>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              Wuryantoro - Wonogiri
            </p>
          </div>

          {/* MOTTO / INFO BAWAH */}
          <div className="w-full">
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Pelayanan Bimbingan Konseling & Presensi Terpadu
            </p>
          </div>
        </div>

        {/* RIGHT PANE: LOGIN FORM */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto my-auto space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">Welcome back!</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 font-normal">
                Masuk ke panel guru BK untuk memulai aktivitas
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              {/* USERNAME */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username akun BK"
                  disabled={isLoading}
                  required
                  className="w-full bg-[#f8fafc] border border-gray-200/80 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 font-medium focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                />
              </div>

              {/* PASSWORD */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi"
                  disabled={isLoading}
                  required
                  className="w-full bg-[#f8fafc] border border-gray-200/80 rounded-xl pl-11 pr-11 py-3 text-sm text-gray-900 placeholder:text-gray-400 font-medium focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => toast.info("Silakan hubungi administrator sekolah jika lupa kredensial.")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Memproses..." : "Login"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center text-[11px] text-gray-400 font-medium">
            &copy; 2026 SMK GAJAH MUNGKUR 1 WURYANTORO • ALL RIGHTS RESERVED
          </div>
        </div>

      </div>
    </div>
  );
}
