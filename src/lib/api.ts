// Set explicitly per environment so local/test builds cannot silently target another backend.
export const API_URL = process.env.NEXT_PUBLIC_GAS_API_URL?.trim() || "";

function requireApiUrl() {
  if (!API_URL) throw new Error("NEXT_PUBLIC_GAS_API_URL belum dikonfigurasi untuk environment ini.");
  return API_URL;
}

// ─── Response shape from GAS backend ────────────────────────────────────────
export interface GasResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
  profile?: { gasMs: number; openSpreadsheetMs: number; sheetLookupMs: number; sheetReadMs: number; sheetReads: number; cache?: string };
}

export interface AttendancePageData {
  students: Siswa[];
  logs: LogPresensi[];
}

// ─── Core transport ──────────────────────────────────────────────────────────

const pendingGets = new Map<string, Promise<GasResponse<unknown>>>();

/** GET ?action=<action>&<params>  — reads from Sheets */
export async function gasGet<T = unknown>(
  action: string,
  params: Record<string, string> = {}
): Promise<GasResponse<T>> {
  const apiUrl = requireApiUrl();
  const started = Date.now();
  const profiling = process.env.NODE_ENV === "development";
  const token = sessionToken();
  const qs = new URLSearchParams({ ...params, ...(profiling ? { profile: "true" } : {}), action, token });
  const key = qs.toString();
  const existing = pendingGets.get(key);
  if (existing) return existing as Promise<GasResponse<T>>;
  const request = (async () => {
  const url = `${apiUrl}?${qs}`;
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(60000) });
    const host = safeResponseHost(res.url);
    // ContentService redirects each response to a one-time googleusercontent.com URL.
    if (res.status !== 404 || !res.redirected || host !== "script.googleusercontent.com" || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  if (!res.ok) {
    const host = safeResponseHost(res.url);
    console.warn("[BK_API]", JSON.stringify({ action, method: "GET", status: res.status, host, redirected: res.redirected, elapsedMs: Date.now() - started }));
    throw new Error(`GAS GET ${action} → HTTP ${res.status}${host ? ` (${host})` : ""}`);
  }
  const result = checkSession<T>(await res.json(), token);
  if (profiling && result.profile) console.info("[BK_PERF]", JSON.stringify({ action, httpMs: Date.now() - started, ...result.profile }));
  return result;
  })();
  pendingGets.set(key, request);
  try { return await request; }
  finally { if (pendingGets.get(key) === request) pendingGets.delete(key); }

}

function safeResponseHost(responseUrl: string): string {
  try { return new URL(responseUrl).hostname; }
  catch { return ""; }
}

/** POST body: { action, data } | { action, ...payload }  — writes to Sheets */
export async function gasPost<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<GasResponse<T>> {
  const started = Date.now();
  const profiling = process.env.NODE_ENV === "development";
  const token = action === "login" ? "" : sessionToken();
  const res = await fetch(requireApiUrl(), {
    method: "POST",
    keepalive: action === "logout",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, ...(profiling ? { profile: "true" } : {}), action, token }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`GAS POST ${action} → HTTP ${res.status}`);
  const result = checkSession<T>(await res.json(), token);
  if (profiling && result.profile) console.info("[BK_PERF]", JSON.stringify({ action, httpMs: Date.now() - started, ...result.profile }));
  return result;
}

function sessionToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("bk_auth_token") || "";
}

function checkSession<T>(response: GasResponse<T> & { code?: string }, token: string): GasResponse<T> {
  if (response.code === "UNAUTHORIZED" && token && token === sessionToken() && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bk-session-expired"));
  }
  return response;
}

// ─── Type definitions (mirrors backend-rest-api.md) ─────────────────────────

export interface Siswa {
  no?: number;
  kelas: string;
  nis: string;
  nama: string;
  nisn?: string;
  agama?: string;
  "L/P"?: string;
  tingkat?: string;
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

export interface User { id: string; username: string; nama: string; role: string; }
export interface LoginData { token: string; user: User; expiresAt: number; }
export interface DashboardStats {
  totalMurid: number; hadirHariIni: number; absenHariIni: number; persentaseKehadiran: number;
  tanggal: string; breakdown: { SAKIT: number; IZIN: number; ALPHA: number };
  chart: { weekly: { label: string; hadir: number; absen: number }[]; monthly: { label: string; hadir: number; absen: number }[] };
}
export interface RekapBulananRow {
  nis: string; nama: string; kelas: string; sakit: number; izin: number; alpha: number;
  totalTidakHadir: number; dailyLogs: Record<string, string>;
}
export interface BankKasus { id_kasus: string; tanggal: string; nis: string; nama: string; kelas: string; jenis_pelanggaran: string; waktu_simpan: string; }
export interface StudentDirectory { students: Siswa[]; logs: LogPresensi[]; kasus: BankKasus[]; penyelesaian: PenyelesaianKasus[]; }
export const getBankKasus = () => gasGet<BankKasus[]>("getBankKasus");
export interface SiswaSummary extends Siswa { totalAlpha: number; totalSakit: number; totalIzin: number; totalPelanggaran: number; }
export const getStudentSummary = (fresh = false) => gasGet<{ students: SiswaSummary[] }>("getStudentDirectory", { summary: "true", ...(fresh ? { fresh: "true" } : {}) });
export const getStudentDetail = (nis: string, tingkat?: string) => gasGet<StudentDirectory>("getStudentDirectory", { nis, ...(tingkat ? { tingkat } : {}) });
// ─── GET helpers ─────────────────────────────────────────────────────────────

export const getSiswa = (tingkat: "X" | "XI" | "XII" | "SEMUA" = "SEMUA") =>
  gasGet<Siswa[]>("getSiswa", { tingkat });

export const getAttendancePageData = (tingkat: "X" | "XI" | "XII", date: string, fresh = false) =>
  gasGet<AttendancePageData>("getAttendancePageData", { tingkat, date, ...(fresh ? { fresh: "true" } : {}) });

export const getLogPresensi = (params?: {
  nis?: string;
  date?: string;   // yyyy-mm
  status?: string;
  kelas?: string;
  academic_year?: string;
}) => gasGet<LogPresensi[]>("getLogPresensi", dropEmpty(params));

export const getPeringatanKasus = (params?: {
  nis?: string;
  status_peringatan?: "AKTIF" | "SELESAI";
}) => gasGet<PeringatanKasus[]>("getPeringatanKasus", dropEmpty(params));

export const getPenyelesaianKasus = (nis?: string) =>
  gasGet<PenyelesaianKasus[]>("getPenyelesaianKasus", dropEmpty({ nis }));

export const getPriorityAlerts = () =>
  getPeringatanKasus({ status_peringatan: "AKTIF" });

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
  gasPost<LoginData>("login", { username, password });

export const saveAttendance = (
  date: string,
  attendances: Partial<LogPresensi>[]
) => gasPost<{ alertSyncPending?: boolean; uploadedLinks?: { nis: string; linkBukti: string }[] }>("saveAttendance", { date, attendances });

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
  request_id: string;
  students: { nis: string; nama: string; kelas: string }[];
}) => gasPost("saveBankKasus", payload);

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
