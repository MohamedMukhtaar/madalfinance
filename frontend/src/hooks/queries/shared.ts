import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  tasks: (params?: ListParams) => ["tasks", params] as const,
  taskStats: ["task-stats"] as const,
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
