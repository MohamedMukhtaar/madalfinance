import type { MonthValue } from "@/components/ui";

export function currentMonth(): MonthValue {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1 };
}

export function monthRange(month: MonthValue): { from: string; to: string } {
  const from = `${month.year}-${String(month.month).padStart(2, "0")}-01`;
  const lastDay = new Date(month.year, month.month, 0).getDate();
  const to = `${month.year}-${String(month.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function monthRangeParams(month: MonthValue): { fromDate: string; toDate: string } {
  const { from, to } = monthRange(month);
  return { fromDate: from, toDate: to };
}

export function matchesMonth(value: string | null | undefined, month: MonthValue): boolean {
  if (!value) return false;
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return y === month.year && m === month.month;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() === month.year && parsed.getMonth() + 1 === month.month;
}

export function formatMonthLabel(month: MonthValue): string {
  return new Date(month.year, month.month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
