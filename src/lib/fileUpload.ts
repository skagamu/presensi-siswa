export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
];

export const ACCEPT_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png";

export interface FileData {
  fileName: string;
  fileBase64: string;
  fileSize: number;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string) || "";
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function validateFile(file: File, maxMb = 10): { valid: boolean; error?: string } {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Format file tidak didukung (${ext}). Gunakan PDF, Word, Excel, atau Gambar.`,
    };
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maksimal ${maxMb} MB.`,
    };
  }

  return { valid: true };
}
