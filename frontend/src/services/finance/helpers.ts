import { authApi, api, apiUrl, type ApiEnvelope } from "../api";
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
    assigneeType: "assignee_type",
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
      ? apiUrl(`/public/avatars/${encodeURIComponent(m.avatarPath)}`)
      : m.avatarUrl ?? null,
  };
}

export function withUserAvatar<U extends { avatarPath?: string | null; avatarUrl?: string | null }>(u: U): U {
  return {
    ...u,
    avatarUrl: u.avatarPath
      ? apiUrl(`/public/user-avatars/${encodeURIComponent(u.avatarPath)}`)
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
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
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
  return `/api/files/${type}/${encodeURIComponent(filename)}`;
}

export async function fetchFileBlob(
  type: string,
  filename: string,
  options?: { inline?: boolean }
): Promise<Blob> {
  const inline = options?.inline ? "?inline=1" : "";
  const res = await api.get<Blob>(`/files/${type}/${encodeURIComponent(filename)}${inline}`, {
    responseType: "blob",
  });
  return res.data;
}
