/** Milliseconds since epoch; invalid dates sort as 0. */
export function timeValue(date?: string | null): number {
  const t = new Date(date ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Oldest first — use before running-balance calculations. */
export function sortByTimeAsc<T>(items: T[], getTime: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => timeValue(getTime(a)) - timeValue(getTime(b)));
}

/** Newest first — activity lists without a running balance column. */
export function sortByTimeDesc<T>(items: T[], getTime: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => timeValue(getTime(b)) - timeValue(getTime(a)));
}

/** Compute forward running balance, then return rows newest-first. */
export function runningBalanceNewestFirst<T extends { debit: number; credit: number; payout?: number }>(
  items: T[],
  getTime: (item: T) => string | null | undefined,
  net: (item: T) => number = (item) =>
    Number(item.debit ?? 0) - Number(item.credit ?? 0) - Number(item.payout ?? 0)
): Array<T & { balance: number }> {
  const sorted = sortByTimeAsc(items, getTime);
  let balance = 0;
  const rows = sorted.map((item) => {
    balance = Math.round((balance + net(item)) * 100) / 100;
    return { ...item, balance };
  });
  return rows.reverse();
}

/** Compute forward running balance, return rows oldest-first (standard statement order). */
export function runningBalanceAsc<T extends { debit: number; credit: number; payout?: number }>(
  items: T[],
  getTime: (item: T) => string | null | undefined,
  net: (item: T) => number = (item) =>
    Number(item.debit ?? 0) - Number(item.credit ?? 0) - Number(item.payout ?? 0)
): Array<T & { balance: number }> {
  const sorted = sortByTimeAsc(items, getTime);
  let balance = 0;
  return sorted.map((item) => {
    balance = Math.round((balance + net(item)) * 100) / 100;
    return { ...item, balance };
  });
}
