export const VIEWS = [
  { id: "customers", label: "Collections", path: "/reports/customers" },
  { id: "statements", label: "Statements", path: "/reports/statements" },
  { id: "employees", label: "HR", path: "/reports/employees" },
  { id: "accounts", label: "Cash books", path: "/reports/accounts" },
  { id: "expenses", label: "Spending", path: "/reports/expenses" },
  { id: "members", label: "Member dues", path: "/reports/members" },
  { id: "income-statement", label: "Profit & loss", path: "/reports/income-statement" },
  { id: "cash-flow", label: "Cash in / out", path: "/reports/cash-flow" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export const VIEW_HINTS: Record<ViewId, string> = {
  customers: "Who still owes setup fees, rent, or other invoices — and what has already been collected.",
  statements: "A running ledger for one customer, member, project, or expense.",
  employees: "Staff profile plus salary charges and payments.",
  accounts: "Cash and bank movement per account.",
  expenses: "Where money went, grouped by category.",
  members: "Member contributions, loans, and dues.",
  "income-statement": "Revenue minus expenses for the selected period.",
  "cash-flow": "Money that actually entered or left the ledger — not billed-but-unpaid invoices.",
};

export type StatementKind = "customer" | "member" | "project" | "expense";

export const STATEMENT_KINDS: Array<{ id: StatementKind; label: string }> = [
  { id: "customer", label: "Customer" },
  { id: "member", label: "Member" },
  { id: "project", label: "Project" },
  { id: "expense", label: "Expense" },
];

export const selectClass =
  "min-w-[14rem] rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700";

export const CHART_PALETTE = ["#74bcf8", "#101848", "#4aa6ef", "#10b981", "#f59e0b", "#1a255c", "#f43f5e", "#14b8a6"];

export function dueBatchLabel(batch: { batchId: number; month?: number; year?: number }) {
  const month = Number(batch.month);
  const year = Number(batch.year);
  if (month >= 1 && month <= 12 && year > 1900) {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `Batch #${batch.batchId}`;
}

export function resolveView(param?: string): ViewId {
  if (param === "salary") return "employees";
  if (
    param === "customers" ||
    param === "statements" ||
    param === "employees" ||
    param === "accounts" ||
    param === "expenses" ||
    param === "members" ||
    param === "income-statement" ||
    param === "cash-flow"
  ) {
    return param;
  }
  return "customers";
}

export function monthLabel(ym: string) {
  if (!ym || !ym.includes("-")) return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

export function asRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { rows?: unknown[] }).rows)) {
    return (data as { rows: T[] }).rows;
  }
  return [];
}
