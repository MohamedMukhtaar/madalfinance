export function formatCurrency(
  value: number | null | undefined,
  currency = "$",
  decimals = 2
): string {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  const symbol =
    !currency || currency.toUpperCase() === "USD" || currency === "US$" ? "$" : currency;
  return `${symbol}${safe.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatCompactCurrency(value: number | null | undefined, currency = "$"): string {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  const symbol =
    !currency || currency.toUpperCase() === "USD" || currency === "US$" ? "$" : currency;
  if (Math.abs(safe) >= 1_000_000) {
    return `${symbol}${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(safe) >= 1_000) {
    return `${symbol}${(safe / 1_000).toFixed(1)}k`;
  }
  return `${symbol}${safe.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  const amount = Number(value);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("en-US");
}

export function formatDate(date?: string): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date?: string): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date?: string): string {
  if (!date || !/\d{2}:\d{2}/.test(date)) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function formatMonthKey(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

export function daysFromNow(date: string): number {
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function toPdfBlob(html: string): Blob {
  return new Blob([html], { type: "text/html;charset=utf-8" });
}

export function downloadPdfFromHtml(html: string, filename: string): void {
  const blob = toPdfBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val == null ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
