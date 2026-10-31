import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const financePath = path.join(ROOT, "services/finance.ts");
const src = fs.readFileSync(financePath, "utf8");
const lines = src.split(/\r?\n/);

const sections = [
  { key: "auth", start: 212, end: 287, file: "auth.ts" },
  { key: "dashboard", start: 288, end: 324, file: "dashboard.ts" },
  { key: "users", start: 325, end: 520, file: "users.ts" },
  { key: "employees", start: 521, end: 660, file: "employees.ts" },
  { key: "customers", start: 661, end: 693, file: "customers.ts" },
  { key: "projects", start: 694, end: 840, file: "projects.ts" },
  { key: "invoices", start: 841, end: 943, file: "invoices.ts" },
  { key: "accounts", start: 944, end: 1016, file: "accounts.ts" },
  { key: "payments", start: 1017, end: 1049, file: "payments.ts" },
  { key: "expenses", start: 1050, end: 1140, file: "expenses.ts" },
  { key: "income", start: 1141, end: 1167, file: "income.ts" },
  { key: "contributions", start: 1168, end: 1295, file: "contributions.ts" },
  { key: "transactions", start: 1296, end: 1306, file: "transactions.ts" },
  { key: "reports", start: 1307, end: 1419, file: "reports.ts" },
  { key: "settings", start: 1420, end: 1453, file: "settings.ts" },
];

const outDir = path.join(ROOT, "services/finance");
fs.mkdirSync(outDir, { recursive: true });

const helpersContent = `import { authApi, api, apiUrl, type ApiEnvelope } from "../api";
import type { Member } from "@/types";

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
}

export type ListParams = {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  fromDate?: string;
  toDate?: string;
  [key: string]: unknown;
};

export interface TrashItem {
  trashId: number;
  entityType: string;
  entityId: number;
  entityLabel: string;
  deleteReason: string;
  deletedBy?: number | null;
  deletedByName?: string | null;
  deletedAt: string;
}

export interface PasswordStep {
  deviceVerificationRequired: true;
  deviceTicket: string;
  userId: number;
}

export interface UserDevice {
  deviceId: number;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ExpenseChargeRecord {
  expenseChargeId: number;
  chargeNumber: string;
  expenseCategoryId: number;
  categoryName: string;
  description: string | null;
  amount: number;
  paidAmount: number;
  balance: number;
  status: "Pending" | "Partial" | "Paid" | "Cancelled";
  dueDate: string;
  createdAt: string;
  paymentCount?: number;
}

export interface DeviceOptionsResult {
  mode: "register" | "authenticate";
  options: Record<string, unknown>;
  ticket: string;
}

export interface LoginResult {
  user: import("@/types").User;
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  credentialId?: string;
}

export interface InvoiceDetailRaw {
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName?: string;
  customerCompany?: string;
  projectId?: number | null;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  items: Array<{
    itemId: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  attachments: Array<Record<string, unknown>>;
  allocations: Array<{
    allocationId: number;
    paymentId: number;
    paymentNumber: string;
    paymentDate: string;
    amountAllocated: number;
  }>;
}

export const toQuery = (params?: ListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined;
  const map: Record<string, string> = {
    perPage: "per_page",
    fromDate: "from_date",
    toDate: "to_date",
    categoryId: "category_id",
    customerId: "customer_id",
    memberId: "member_id",
    accId: "acc_id",
    projectId: "project_id",
    expenseId: "expense_id",
    employeeId: "employee_id",
    salaryPeriod: "salary_period",
    batchId: "batch_id",
    projectType: "project_type",
    projectTypeId: "project_type_id",
    entityType: "entity_type",
  };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[map[key] ?? key] = value;
  }
  return out;
};

export const unwrap = <T>(res: { data: T }): T => res.data;

export function withMemberAvatar(m: Member): Member {
  return {
    ...m,
    avatarUrl: m.avatarPath
      ? apiUrl(\`/public/avatars/\${encodeURIComponent(m.avatarPath)}\`)
      : m.avatarUrl ?? null,
  };
}

export function withUserAvatar<U extends { avatarPath?: string | null; avatarUrl?: string | null }>(u: U): U {
  return {
    ...u,
    avatarUrl: u.avatarPath
      ? apiUrl(\`/public/user-avatars/\${encodeURIComponent(u.avatarPath)}\`)
      : u.avatarUrl ?? null,
  };
}

export function asPaged<T>(res: ApiEnvelope<T[] | { rows: T[] }>): Paged<T> {
  const meta = res.meta ?? {};
  const rows = Array.isArray(res.data) ? res.data : ((res.data as { rows?: T[] })?.rows ?? []);
  return {
    rows,
    total: Number(meta.total ?? rows.length),
    page: Number(meta.page ?? 1),
    perPage: Number((meta.per_page ?? meta.perPage ?? rows.length) || 20),
  };
}

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => \`_\${c.toLowerCase()}\`);
}

export function toSnakeCase<T = unknown>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => toSnakeCase(v)) as T;
  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !(value instanceof File) &&
    !(value instanceof Blob)
  ) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[toSnakeKey(key)] = toSnakeCase(val);
    }
    return out as T;
  }
  return value;
}

export async function uploadFile<T = unknown>(
  url: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await authApi.upload<T>(url, form, onProgress);
  return unwrap(res);
}

export function fileUrl(type: string, filename: string): string {
  return \`/api/files/\${type}/\${encodeURIComponent(filename)}\`;
}

export async function fetchFileBlob(
  type: string,
  filename: string,
  options?: { inline?: boolean }
): Promise<Blob> {
  const inline = options?.inline ? "?inline=1" : "";
  const res = await api.get<Blob>(\`/files/\${type}/\${encodeURIComponent(filename)}\${inline}\`, {
    responseType: "blob",
  });
  return res.data;
}
`;

fs.writeFileSync(path.join(outDir, "helpers.ts"), helpersContent);

const importsByFile = {
  "auth.ts": `import { authApi } from "../api";
import type { User } from "@/types";
import { unwrap, withUserAvatar, toSnakeCase, uploadFile, type PasswordStep, type LoginResult, type DeviceOptionsResult } from "./helpers";`,
  "dashboard.ts": `import { authApi } from "../api";
import { unwrap } from "./helpers";`,
  "users.ts": `import { authApi, api } from "../api";
import type { User, AuditLog, Member } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, withUserAvatar, withMemberAvatar, uploadFile, type ListParams, type Paged, type UserDevice } from "./helpers";`,
  "employees.ts": `import { authApi } from "../api";
import type { Employee, EmployeeOrgKind, EmployeeOrgRecord, SalaryCharge, SalaryPayment } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";`,
  "customers.ts": `import { authApi } from "../api";
import type { Customer } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";`,
  "projects.ts": `import { authApi } from "../api";
import type { Project, RentalBilling } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged } from "./helpers";`,
  "invoices.ts": `import { authApi, api } from "../api";
import type { Invoice } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged, type InvoiceDetailRaw } from "./helpers";`,
  "accounts.ts": `import { authApi } from "../api";
import { unwrap, toSnakeCase } from "./helpers";`,
  "payments.ts": `import { authApi } from "../api";
import type { Payment } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged } from "./helpers";`,
  "expenses.ts": `import { authApi } from "../api";
import type { Expense } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged, type ExpenseChargeRecord } from "./helpers";`,
  "income.ts": `import { authApi } from "../api";
import type { OtherIncome } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";`,
  "contributions.ts": `import { authApi, apiUrl } from "../api";
import type { DueBatch, MemberDue } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged } from "./helpers";`,
  "transactions.ts": `import { authApi } from "../api";
import type { LedgerTransaction } from "@/types";
import { unwrap, asPaged, toQuery, type ListParams, type Paged } from "./helpers";`,
  "reports.ts": `import { authApi, api } from "../api";
import { unwrap, toQuery, type ListParams } from "./helpers";`,
  "settings.ts": `import { authApi } from "../api";
import type { AppSettings } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, fileUrl, type ListParams, type Paged, type TrashItem } from "./helpers";`,
};

function sliceMethods(startLine, endLine) {
  const chunk = lines.slice(startLine - 1, endLine).join("\n");
  return chunk
    .replace(/this\.upload</g, "uploadFile<")
    .replace(/this\.upload\(/g, "uploadFile(")
    .replace(/await this\.upload/g, "await uploadFile")
    .replace(/this\.fileUrl/g, "fileUrl")
    .replace(/await this\.exportReportUrl/g, "await exportReportUrl")
    .replace(/const url = await this\.exportReportUrl/g, "const url = await exportReportUrl");
}

for (const sec of sections) {
  let body = sliceMethods(sec.start, sec.end);
  // reports: downloadReport calls exportReportUrl on same object — keep as method refs via local helper
  if (sec.key === "reports") {
    body = body.replace(
      /const url = await exportReportUrl\(kind, format, params\);/,
      "const url = await reportsApi.exportReportUrl(kind, format, params);"
    );
  }
  if (sec.key === "settings") {
    body = body.replace(/return this\.fileUrl/g, "return fileUrl").replace(/return fileUrl/g, "return fileUrl");
    body = body.replace(
      /companyLogoUrl\(filename: string\): string \{\s*return fileUrl\("logos", filename\);\s*\},?/,
      ""
    );
  }

  const name = `${sec.key}Api`;
  const content = `${importsByFile[sec.file]}

export const ${name} = {
${body}
};
`;
  fs.writeFileSync(path.join(outDir, sec.file), content);
}

// Fix reports circular: use function declaration style
const reportsPath = path.join(outDir, "reports.ts");
let reports = fs.readFileSync(reportsPath, "utf8");
reports = reports.replace(
  "export const reportsApi = {",
  `async function exportReportUrl(kind: string, format: "pdf" | "xlsx", params?: ListParams): Promise<string> {
  const q = toQuery(params) ?? {};
  const search = new URLSearchParams({ ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])), format }).toString();
  return \`/api/reports/\${kind}/export?\${search}\`;
}

export const reportsApi = {`
);
// If original exportReportUrl method still exists, leave it; downloadReport should call local fn
reports = reports.replace(/await reportsApi\.exportReportUrl/g, "await exportReportUrl");
// Remove duplicate exportReportUrl method body if we inlined poorly — keep object's method that matches original
fs.writeFileSync(reportsPath, reports);

const index = `import { uploadFile, fileUrl, fetchFileBlob } from "./helpers";
import { authApi } from "./auth";
import { dashboardApi } from "./dashboard";
import { usersApi } from "./users";
import { employeesApi } from "./employees";
import { customersApi } from "./customers";
import { projectsApi } from "./projects";
import { invoicesApi } from "./invoices";
import { accountsApi } from "./accounts";
import { paymentsApi } from "./payments";
import { expensesApi } from "./expenses";
import { incomeApi } from "./income";
import { contributionsApi } from "./contributions";
import { transactionsApi } from "./transactions";
import { reportsApi } from "./reports";
import { settingsApi } from "./settings";

export type {
  Paged,
  ListParams,
  TrashItem,
  PasswordStep,
  UserDevice,
  ExpenseChargeRecord,
  DeviceOptionsResult,
  LoginResult,
} from "./helpers";
export { toSnakeCase } from "./helpers";

export const financeService = {
  ...authApi,
  ...dashboardApi,
  ...usersApi,
  ...employeesApi,
  ...customersApi,
  ...projectsApi,
  ...invoicesApi,
  ...accountsApi,
  ...paymentsApi,
  ...expensesApi,
  ...incomeApi,
  ...contributionsApi,
  ...transactionsApi,
  ...reportsApi,
  ...settingsApi,
  upload: uploadFile,
  fileUrl,
  fetchFileBlob,
  companyLogoUrl(filename: string): string {
    return fileUrl("logos", filename);
  },
};

export type FinanceService = typeof financeService;
`;

fs.writeFileSync(path.join(outDir, "index.ts"), index);

fs.writeFileSync(
  financePath,
  `export {
  financeService,
  toSnakeCase,
  type FinanceService,
  type Paged,
  type ListParams,
  type TrashItem,
  type PasswordStep,
  type UserDevice,
  type ExpenseChargeRecord,
  type DeviceOptionsResult,
} from "./finance/index";
`
);

console.log("OK", fs.readdirSync(outDir).join(", "));
