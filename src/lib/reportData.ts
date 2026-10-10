export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function jakartaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
export function cappedRange(start: string, end: string): [string, string] {
  if (start > end) [start, end] = [end, start];
  const limit = new Date(`${start}T00:00:00`);
  limit.setDate(limit.getDate() + 59);
  return [start, end > dateKey(limit) ? dateKey(limit) : end];
}
export function reportStatus(logs: Record<string, string>, date: string, monthly: boolean, today = jakartaToday()): string {
  if (date > today) return "";
  return (logs[monthly ? String(Number(date.slice(-2))) : date] || "HADIR").toUpperCase().trim();
}
export function periodCounts(logs: Record<string, string>, dates: string[], monthly: boolean, today = jakartaToday()) {
  const result = { sakit: 0, izin: 0, alpha: 0, totalTidakHadir: 0 };
  for (const date of dates) {
    const status = reportStatus(logs, date, monthly, today);
    if (status === "SAKIT") result.sakit++;
    if (status === "IZIN") result.izin++;
    if (status === "ALPHA") result.alpha++;
  }
  result.totalTidakHadir = result.sakit + result.izin + result.alpha;
  return result;
}
export function absenceRate(absences: number, opportunities: number): number {
  return opportunities > 0 ? Math.min(1, Math.max(0, absences / opportunities)) : 0;
}
