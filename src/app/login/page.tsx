"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { fetchGasApi } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User } from "lucide-react";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Header Biru */}
        <div className="bg-primary px-8 py-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sistem Manajemen BK</h1>
          <p className="text-primary-foreground/80 mt-1 text-sm font-medium">Masuk untuk mengelola presensi dan pelanggaran siswa.</p>
        </div>

        {/* Form Area */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-3 font-medium outline-none" 
                  placeholder="Masukkan username..." 
                  disabled={isLoading}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 pr-10 p-3 font-medium outline-none" 
                  placeholder="••••••••" 
                  disabled={isLoading}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full text-white bg-primary hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-bold rounded-lg text-sm px-5 py-3.5 text-center transition-all disabled:opacity-70 mt-4"
            >
              {isLoading ? "Memverifikasi Kredensial..." : "Masuk ke Sistem"}
            </button>
          </form>
          
          <div className="mt-8 text-center text-xs text-gray-400 font-medium">
            &copy; 2026 Bimbingan Konseling Sekolah
          </div>
        </div>

      </div>
    </div>
  );
}
