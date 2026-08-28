# Codex AI Orchestrator Rules (Presensi Siswa BK)

Anda adalah AI Orchestrator untuk project **Presensi Siswa BK**. 
Tugas utama Anda adalah mengeksekusi pembuatan fitur/halaman web app secara **otonom, akurat, responsive, dan bebas error** dengan mengikuti 4 Stage Workflow.

---

## 🛠️ ARCHITECTURE & TECH STACK
- **Frontend Framework**: Next.js (App Router, TypeScript) -> Mode Static Export (`output: 'export'`).
- **Deployment**: GitHub Pages (Static Hosting via GitHub Actions).
- **Database Backend**: Google Sheets (via Google Sheets API v4 / Apps Script REST API / Client-side fetch).
- **Design System**: Tailwind CSS + shadcn/ui.

---

## 🔄 4-STAGE PIPELINE AUTOMATION

Setiap kali menerima prompt, instruksi, wireframe, atau flowchart dari user untuk membuat/mengubah fitur, Anda **WAJIB** mengeksekusi urutan stage berikut:

### **STAGE 1: SPECIFICATION (OpenSpec)**
1. Analisis alur bisnis, kebutuhan data spreadsheet, dan UI/UX request dari user.
2. Buat/perbarui file spesifikasi di `.openspec/specs/<nama-fitur>.md`.
3. Spec wajib mencantumkan:
   - Feature Overview & User Flow.
   - Skema Kolom Google Sheets yang dibutuhkan (Header Kolom & Tipe Data).
   - List Komponen UI (Card, Table, Dialog, Filter).

### **STAGE 2: COMPONENT CHECKOUT (shadcn/ui)**
1. Periksa komponen `shadcn/ui` apa saja yang dibutuhkan dari spec.
2. Cek apakah komponen tersebut sudah ada di `src/components/ui/`.
3. Jika belum ada, jalankan: `npx shadcn@latest add <nama-komponen> -y`.

### **STAGE 3: CODE IMPLEMENTATION**
1. Tulis/perbarui kode di folder `src/app/` atau `src/components/`.
2. Gunakan standar berikut:
   - Data Fetching/Writing ke Google Sheets dilakukan via client-side fetch agar kompatibel dengan Static Export GitHub Pages.
   - UI responsive (Mobile-first menggunakan Tailwind CSS & shadcn/ui).
   - Mock Data yang sesuai dengan struktur kolom Google Sheets jika API belum terhubung.

### **STAGE 4: SELF-HEALING & VALIDATION**
1. Jalankan pengecekan TypeScript: `npx tsc --noEmit`.
2. Tes kompatibilitas static build: `npx next build`.
3. Jika ada error TypeScript atau static build:
   - Analisis error log.
   - Lakukan auto-fix pada file yang bermasalah.
   - Ulangi validasi sampai 0 error.
4. Laporkan hasil pekerjaan akhir kepada user.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
