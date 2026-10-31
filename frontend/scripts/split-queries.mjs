import fs from "node:fs";
import path from "node:path";

const srcPath = path.resolve("src/hooks/queries.ts");
const src = fs.readFileSync(srcPath, "utf8");
const lines = src.split(/\r?\n/);

const outDir = path.resolve("src/hooks/queries");
fs.mkdirSync(outDir, { recursive: true });

// Find section starts
const markers = [];
lines.forEach((l, i) => {
  const m = l.match(/^\/\* -{10,} (.+) -{10,} \*\//);
  if (m) markers.push({ title: m[1].trim(), line: i + 1 });
});

const headerEnd = markers[0]?.line - 1 || 78;

const header = lines.slice(0, headerEnd).join("\n");

// Write shared.ts from header (qk + helpers)
const shared = `${header}

export type { ListParams } from "@/services/finance";
`;
fs.writeFileSync(path.join(outDir, "shared.ts"), shared.replace(
  'import { financeService, type ListParams } from "@/services/finance";',
  'import { financeService, type ListParams } from "@/services/finance";\nexport { financeService };'
).replace(
  'import { getErrorMessage } from "@/services/api";',
  'import { getErrorMessage } from "@/services/api";\nexport { getErrorMessage };'
).replace(
  'import toast from "react-hot-toast";',
  'import toast from "react-hot-toast";\nexport { toast };'
));

// Actually rewrite shared cleanly
const sharedClean = `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService, type ListParams } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import toast from "react-hot-toast";

export { useMutation, useQuery, useQueryClient, financeService, getErrorMessage, toast };
export type { ListParams };

export const qk = {
  dashboard: (params?: { year?: number; month?: number }) =>
    ["dashboard", params?.year, params?.month] as const,
  customers: (params?: ListParams) => ["customers", params] as const,
  customer: (id: number) => ["customers", id] as const,
  projects: (params?: ListParams) => ["projects", params] as const,
  projectTemplates: ["project-templates"] as const,
  rentals: (params?: ListParams) => ["rentals", params] as const,
  invoices: (params?: ListParams) => ["invoices", params] as const,
  invoice: (id: number) => ["invoices", id] as const,
  payments: (params?: ListParams) => ["payments", params] as const,
  dues: (params?: ListParams) => ["dues", params] as const,
  duesDetail: (id: number) => ["dues", id] as const,
  expenses: (params?: ListParams) => ["expenses", params] as const,
  expenseCategories: ["expense-categories"] as const,
  accounts: ["accounts"] as const,
  accountStatement: (id: number, params?: ListParams) => ["accounts", id, "statement", params] as const,
  transactions: (params?: ListParams) => ["transactions", params] as const,
  members: ["members"] as const,
  employees: (params?: ListParams) => ["employees", params] as const,
  employeeOrg: (kind: string) => ["employee-org", kind] as const,
  salaryCharges: (params?: ListParams) => ["salary-charges", params] as const,
  salaryPayments: (params?: ListParams) => ["salary-payments", params] as const,
  income: (params?: ListParams) => ["income", params] as const,
  incomeCategories: ["income-categories"] as const,
  users: (params?: ListParams) => ["users", params] as const,
  roles: ["roles"] as const,
  permissionCatalog: ["permission-catalog"] as const,
  organization: ["organization"] as const,
  auditLogs: (params?: ListParams) => ["audit-logs", params] as const,
  settings: ["settings"] as const,
  reports: {
    incomeStatement: ["reports", "income-statement"] as const,
    outstanding: ["reports", "outstanding"] as const,
    customerPayment: ["reports", "customer-payment"] as const,
    expenses: ["reports", "expenses"] as const,
    contributions: (batchId?: number) => ["reports", "contributions", batchId] as const,
    monthly: ["reports", "monthly"] as const,
    cashFlow: ["reports", "cash-flow"] as const,
  },
};

export function toastErr(err: unknown, fallback: string) {
  toast.error(getErrorMessage(err, fallback));
}

export function patchRentalStatus(old: unknown, id: number, status: string) {
  if (!old || typeof old !== "object") return old;
  const data = old as { rows?: Array<{ billingId: number; status: string }> };
  if (!Array.isArray(data.rows)) return old;
  return {
    ...data,
    rows: data.rows.map((row) => (row.billingId === id ? { ...row, status } : row)),
  };
}

export type QueryOpts = ListParams & { enabled?: boolean };

export function splitQuery(params?: QueryOpts) {
  const { enabled = true, ...rest } = params ?? {};
  return { enabled, params: rest };
}
`;
fs.writeFileSync(path.join(outDir, "shared.ts"), sharedClean);

const fileMap = {
  DASHBOARD: "dashboard.ts",
  CUSTOMERS: "customers.ts",
  PROJECTS: "projects.ts",
  RENTALS: "rentals.ts",
  INVOICES: "invoices.ts",
  PAYMENTS: "payments.ts",
  CONTRIBUTIONS: "contributions.ts",
  "USERS (SUPER ADMIN)": "users.ts",
  MEMBERS: "members.ts",
  "EMPLOYEES / SALARY": "employees.ts",
  "OTHER INCOME": "income.ts",
  EXPENSES: "expenses.ts",
  ACCOUNTS: "accounts.ts",
  TRANSACTIONS: "transactions.ts",
  REPORTS: "reports.ts",
};

const sections = markers.map((m, i) => ({
  ...m,
  end: i + 1 < markers.length ? markers[i + 1].line - 1 : lines.length,
  file: fileMap[m.title] || `${m.title.toLowerCase().replace(/\W+/g, "-")}.ts`,
}));

const imports = `import {
  useMutation,
  useQuery,
  useQueryClient,
  financeService,
  qk,
  toastErr,
  toast,
  getErrorMessage,
  splitQuery,
  patchRentalStatus,
  type QueryOpts,
  type ListParams,
} from "./shared";
`;

for (const sec of sections) {
  const body = lines.slice(sec.line - 1, sec.end).join("\n");
  fs.writeFileSync(path.join(outDir, sec.file), `${imports}\n${body}\n`);
  console.log(sec.file, sec.line, "-", sec.end);
}

const indexExports = [
  'export { qk, type QueryOpts } from "./shared";',
  ...[...new Set(sections.map((s) => s.file))].map((f) => `export * from "./${f.replace(/\.ts$/, "")}";`),
].join("\n");

fs.writeFileSync(path.join(outDir, "index.ts"), indexExports + "\n");

fs.writeFileSync(srcPath, `export * from "./queries/index";\n`);
console.log("queries split OK");
