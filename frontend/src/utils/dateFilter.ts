export type DateFilterOptions = {
  mode: "all" | "day" | "range";
  date?: string;
  from?: string;
  to?: string;
};

function calendarDate(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function matchesDateFilter(
  value: string | null | undefined,
  { mode, date, from, to }: DateFilterOptions
): boolean {
  if (mode === "all") return true;
  if (!value) return false;

  const valueDate = calendarDate(value);
  if (!valueDate) return false;

  if (mode === "day") return Boolean(date) && valueDate === date;
  return (!from || valueDate >= from) && (!to || valueDate <= to);
}
