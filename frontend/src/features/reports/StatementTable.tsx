import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, formatTime, formatMemberStatementBalance } from "@/utils/format";
import { Skeleton } from "@/components/ui";
import type { StatementRow } from "@/types";

export function StatementTable({
  rows,
  loading = false,
  showLoan = false,
  memberBalance = false,
  currency,
  empty = "No transactions for this period.",
}: {
  rows: StatementRow[];
  loading?: boolean;
  showLoan?: boolean;
  memberBalance?: boolean;
  currency: string;
  empty?: string;
}) {
  const colCount = showLoan ? 8 : 7;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Reference</th>
            <th className="px-3 py-2 text-right">Debit</th>
            <th className="px-3 py-2 text-right">Credit</th>
            {showLoan ? <th className="px-3 py-2 text-right">Loan</th> : null}
            <th className="px-3 py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-8">
                <Skeleton className="h-8 w-full" />
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={`${r.date}-${r.time}-${r.reference}-${i}`} className="text-slate-600 dark:text-slate-300">
                <td className="px-3 py-2 text-xs">{formatDate(r.date)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{formatTime(r.time)}</td>
                <td className="px-3 py-2 font-medium">{r.type || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.reference || "—"}</td>
                <td className={cn("px-3 py-2 text-right font-mono", r.debit > 0 && "text-rose-600 dark:text-rose-400")}>
                  {r.debit > 0 ? formatCurrency(r.debit, currency) : "—"}
                </td>
                <td className={cn("px-3 py-2 text-right font-mono", r.credit > 0 && "text-emerald-600 dark:text-emerald-400")}>
                  {r.credit > 0 ? formatCurrency(r.credit, currency) : "—"}
                </td>
                {showLoan ? (
                  <td className={cn("px-3 py-2 text-right font-mono", r.loan > 0 && "text-amber-600 dark:text-amber-400")}>
                    {r.loan > 0 ? formatCurrency(r.loan, currency) : "—"}
                  </td>
                ) : null}
                <td
                  className={cn(
                    "px-3 py-2 text-right font-mono text-xs font-semibold",
                    r.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"
                  )}
                >
                  {memberBalance
                    ? formatMemberStatementBalance(r.balance, currency)
                    : formatCurrency(r.balance, currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-slate-400">{empty}</p>
      )}
    </div>
  );
}
