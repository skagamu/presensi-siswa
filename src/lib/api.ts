// Google Apps Script Web App URL
export const API_URL =
  "https://script.google.com/macros/s/AKfycbxnV2plOOQfhZHhfK--IOzmqaJCXpOpulVxzcwaF7HqE4cZAWJUc52q8yjYt-W3MBcI/exec";

// ─── Response shape from GAS backend ────────────────────────────────────────
export interface GasResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
}

// ─── Core transport ──────────────────────────────────────────────────────────

/** GET ?action=<action>&<params>  — reads from Sheets */
export async function gasGet<T = unknown>(
  action: string,
  params: Record<string, string> = {}
): Promise<GasResponse<T>> {
  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${API_URL}?${qs}`, { method: "GET" });
  if (!res.ok) throw new Error(`GAS GET ${action} → HTTP ${res.status}`);
  return res.json();
}

/** POST body: { action, data } | { action, ...payload }  — writes to Sheets */
export async function gasPost<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<GasResponse<T>> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`GAS POST ${action} → HTTP ${res.status}`);
  return res.json();
}

// ─── Type definitions (mirrors backend-rest-api.md) ─────────────────────────

export interface Siswa {
  no: number;
  kelas: string;
  nis: string;
  nama: string;
  nisn?: string;
  agama?: string;
  "L/P": string;
}

export interface LogPresensi {
  id_presensi: string;
  tanggal: string;           // YYYY-MM-DD
  nis: string;
  nama: string;
  kelas: string;
  status_presensi: "HADIR" | "SAKIT" | "IZIN" | "ALPHA";
  ada_surat_dokter: boolean;
  link_bukti_izin: string;
  waktu_simpan: string;      // YYYY-MM-DD HH:mm:ss
}

export interface PeringatanKasus {
  id_peringatan: string;
  nis: string;
  nama: string;
  kelas: string;
  tingkat_kumulatif: number; // 1–4
  total_hari_absen: number;
  status_peringatan: "AKTIF" | "SELESAI";
  waktu_dibuat: string;
}

export interface PenyelesaianKasus {
  id_penyelesaian: string;
  id_peringatan: string;
  nis: string;
  nama: string;
  kelas: string;
  link_pdf_drive: string;
  catatan_konseling: string;
  ditangani_oleh: string;
  waktu_selesai: string;
}

export interface User {
  user_id: string;
  username: string;
  password_hash: string;
  nama_guru_bk: string;
  status: string;
}

export interface DashboardStats {
  totalSiswa: number;
  hadirHariIni: number;
  sakitHariIni: number;
  izinHariIni: number;
  alphaHariIni: number;
  alertAktif: number;
}

export interface RekapBulananRow {
  nis: string;
  nama: string;
  kelas: string;
  [date: string]: string | number; // dynamic date columns
}

// ─── GET helpers ─────────────────────────────────────────────────────────────

export const getSiswa = (tingkat: "X" | "XI" | "XII" | "SEMUA" = "SEMUA") =>
  gasGet<Siswa[]>("getSiswa", { tingkat });

export const getLogPresensi = (params?: {
  nis?: string;
  date?: string;   // yyyy-mm
  status?: string;
}) => gasGet<LogPresensi[]>("getLogPresensi", dropEmpty(params));

export const getPeringatanKasus = (params?: {
  nis?: string;
  status_peringatan?: "AKTIF" | "SELESAI";
}) => gasGet<PeringatanKasus[]>("getPeringatanKasus", dropEmpty(params));

export const getPenyelesaianKasus = (nis?: string) =>
  gasGet<PenyelesaianKasus[]>("getPenyelesaianKasus", dropEmpty({ nis }));

export const getUsers = () => gasGet<User[]>("getUsers");

export const getPriorityAlerts = () =>
  gasGet<PeringatanKasus[]>("getPriorityAlerts");

export const getDashboardStats = (date?: string) =>
  gasGet<DashboardStats>("getDashboardStats", dropEmpty({ date }));

export const getRekapBulanan = (params?: {
  month?: string;  // yyyy-mm
  tingkat?: "X" | "XI" | "XII" | "SEMUA";
  kelas?: string;
}) => gasGet<RekapBulananRow[]>("getRekapBulanan", dropEmpty(params));

export const getRekapRentang = (params?: {
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  tingkat?: "X" | "XI" | "XII" | "SEMUA";
  kelas?: string;
}) => gasGet<RekapBulananRow[]>("getRekapRentang", dropEmpty(params));

// ─── POST helpers ────────────────────────────────────────────────────────────

export const login = (username: string, password: string) =>
  gasPost<User>("login", { username, password });

export const saveAttendance = (
  date: string,
  attendances: Partial<LogPresensi>[]
) => gasPost("saveAttendance", { date, attendances });

export const createLogPresensi = (data: Omit<LogPresensi, "id_presensi">) =>
  gasPost("createLogPresensi", { data });

export const createBatchLogPresensi = (data: Omit<LogPresensi, "id_presensi">[]) =>
  gasPost("createBatchLogPresensi", { data });

export const createPeringatanKasus = (
  data: Omit<PeringatanKasus, "id_peringatan">
) => gasPost("createPeringatanKasus", { data });

export const createPenyelesaianKasus = (
  data: Omit<PenyelesaianKasus, "id_penyelesaian">
) => gasPost("createPenyelesaianKasus", { data });

export const resolveCase = (payload: {
  id_peringatan: string;
  nis: string;
  nama: string;
  kelas: string;
  catatan_konseling: string;
  ditangani_oleh: string;
  fileBase64?: string;
  fileName?: string;
}) => gasPost("resolveCase", payload);

export const saveBankKasus = (payload: {
  date: string;
  pelanggaran: string;
  students: { nis: string; nama: string; kelas: string }[];
}) => gasPost("saveBankKasus", payload);

export const createSiswa = (
  tingkat: "X" | "XI" | "XII",
  data: Omit<Siswa, "no">
) => gasPost("createSiswa", { tingkat, data });

export const createBatchSiswa = (
  tingkat: "X" | "XI" | "XII",
  data: Omit<Siswa, "no">[]
) => gasPost("createBatchSiswa", { tingkat, data });

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Strip undefined/empty-string keys so URLSearchParams stays clean */
function dropEmpty(
  obj: Record<string, string | undefined> | undefined
): Record<string, string> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")
  ) as Record<string, string>;
}

// Legacy aliases (keep existing callers working during migration)
/** @deprecated use gasGet() */
export const fetchGasApiGet = (
  action: string,
  queryParams: Record<string, string> = {}
) => gasGet(action, queryParams);

/** @deprecated use gasPost() */
export const fetchGasApi = (action: string, payload: Record<string, unknown> = {}) =>
  gasPost(action, payload);
