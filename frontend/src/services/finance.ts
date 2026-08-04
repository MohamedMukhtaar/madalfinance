import { authApi, api, normalizePayload, type ApiEnvelope } from "./api";
import type {
  AppSettings,
  Attachment,
  Customer,
  DueBatch,
  Expense,
  Invoice,
  LedgerTransaction,
  Member,
  MemberDue,
  Payment,
  Project,
  RentalBilling,
  User,
} from "@/types";

/**
 * Real API service layer for the Madal Finance backend.
 */

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

const toQuery = (params?: ListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined;
  const map: Record<string, string> = {
    perPage: "per_page",
    fromDate: "from_date",
    toDate: "to_date",
    categoryId: "category_id",
    customerId: "customer_id",
    memberId: "member_id",
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

const unwrap = <T>(res: { data: T }): T => res.data;

function withMemberAvatar(m: Member): Member {
  return {
    ...m,
    avatarUrl: m.avatarPath
      ? `/api/public/avatars/${encodeURIComponent(m.avatarPath)}`
      : m.avatarUrl ?? null,
  };
}

/** Backend list endpoints return `data` as an array with pagination in `meta`. */
function asPaged<T>(res: ApiEnvelope<T[] | { rows: T[] }>): Paged<T> {
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

/** Deep-convert camelCase keys to snake_case for request bodies. */
export function toSnakeCase<T = unknown>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => toSnakeCase(v)) as T;
  if (value !== null && typeof value === "object" && !(value instanceof Date) && !(value instanceof File) && !(value instanceof Blob)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[toSnakeKey(key)] = toSnakeCase(val);
    }
    return out as T;
  }
  return value;
}

interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

interface InvoiceDetailRaw {
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

export const financeService = {
  /* ------------------------------ AUTH ------------------------------ */
  async login(username: string, password: string): Promise<LoginResult> {
    const res = await authApi.post<LoginResult>("/auth/login", { username, password });
    return unwrap(res);
  },

  async me(): Promise<User> {
    const res = await authApi.get<{ user: User }>("/auth/me");
    return unwrap(res).user;
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await authApi.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      /* revoke failure should never block local sign-out */
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await authApi.put("/auth/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async changeUsername(currentPassword: string, newUsername: string): Promise<void> {
    await authApi.put("/auth/me/username", {
      current_password: currentPassword,
      new_username: newUsername,
    });
  },

  async updateProfile(patch: {
    fullName?: string;
    phone?: string;
    email?: string;
  }): Promise<User> {
    const res = await authApi.put<{ user: User }>("/auth/me/profile", toSnakeCase(patch));
    return unwrap(res).user;
  },

  /* ------------------------------ DASHBOARD ------------------------------ */
  async dashboard(params?: { year?: number; month?: number }) {
    const res = await authApi.get<import("@/types").DashboardData>(
      "/settings/dashboard",
      params ? { year: params.year, month: params.month } : undefined
    );
    return unwrap(res);
  },

  /* ------------------------------ USERS / MEMBERS ------------------------------ */
  async users(params?: ListParams): Promise<Paged<User>> {
    const res = await authApi.get<User[]>("/users", toQuery(params));
    return asPaged(res);
  },

  async auditLogs(params?: ListParams): Promise<Paged<Record<string, unknown>>> {
    const res = await authApi.get<Record<string, unknown>[]>("/users/audit-logs", toQuery(params));
    return asPaged(res);
  },

  async members(): Promise<Member[]> {
    const res = await authApi.get<Member[]>("/contributions/members");
    return unwrap(res).map(withMemberAvatar);
  },

  async listMembers(params?: ListParams): Promise<Paged<Member>> {
    const res = await authApi.get<Member[]>("/users/members", toQuery(params));
    const paged = asPaged(res);
    return { ...paged, rows: paged.rows.map(withMemberAvatar) };
  },

  async createMember(data: {
    username: string;
    password: string;
    fullName: string;
    phone?: string;
    email?: string;
    position?: string;
    defaultMonthlyDue?: number;
    joinedDate?: string;
  }): Promise<Member> {
    const res = await authApi.post<Member>("/users/members", toSnakeCase(data));
    return withMemberAvatar(unwrap(res));
  },

  async updateMember(
    id: number,
    patch: Partial<{
      fullName: string;
      phone: string;
      email: string;
      position: string;
      defaultMonthlyDue: number;
      status: string;
    }>
  ): Promise<Member> {
    const res = await authApi.put<Member>(`/users/members/${id}`, toSnakeCase(patch));
    return withMemberAvatar(unwrap(res));
  },

  async uploadMemberAvatar(id: number, file: File, onProgress?: (p: number) => void): Promise<Member> {
    const member = await this.upload<Member>(`/users/members/${id}/avatar`, file, onProgress);
    return withMemberAvatar(member);
  },

  async deactivateMember(id: number, reason: string): Promise<void> {
    await authApi.delete(`/users/members/${id}`, { reason });
  },

  /** Public team for login page (no auth). */
  async publicTeam(): Promise<Array<{ memberId: number; memberName: string; position?: string; avatarUrl?: string | null }>> {
    const res = await api.get("/public/team");
    const envelope = normalizePayload(res.data) as ApiEnvelope<
      Array<{ memberId: number; memberName: string; position?: string; avatarUrl?: string | null }>
    >;
    return envelope.data ?? [];
  },

  /* ------------------------------ CUSTOMERS ------------------------------ */
  async customers(params?: ListParams): Promise<Paged<Customer>> {
    const res = await authApi.get<Customer[]>("/customers", toQuery(params));
    return asPaged(res);
  },

  async customer(id: number): Promise<Customer> {
    const res = await authApi.get<Customer>(`/customers/${id}`);
    return unwrap(res);
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await authApi.post<Customer>("/customers", toSnakeCase(data));
    return unwrap(res);
  },

  async updateCustomer(id: number, patch: Partial<Customer>): Promise<Customer> {
    const res = await authApi.put<Customer>(`/customers/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteCustomer(id: number, reason: string): Promise<void> {
    await authApi.delete(`/customers/${id}`, { reason });
  },

  async customerStatement(id: number) {
    const res = await authApi.get<Record<string, unknown>>(`/customers/${id}/statement`);
    return unwrap(res);
  },

  /* ------------------------------ PROJECTS ------------------------------ */
  async projects(params?: ListParams): Promise<Paged<Project>> {
    const res = await authApi.get<Project[]>("/projects", toQuery(params));
    return asPaged(res);
  },

  async project(id: number): Promise<Project> {
    const res = await authApi.get<Project>(`/projects/${id}`);
    return unwrap(res);
  },

  async projectTypes(): Promise<Array<{ id: number; name: string }>> {
    const res = await authApi.get<Array<{ projectTypeId: number; typeName: string }>>("/projects/types");
    return unwrap(res).map((t) => ({ id: t.projectTypeId, name: t.typeName }));
  },

  async createProject(data: Record<string, unknown>): Promise<Project> {
    const res = await authApi.post<Project>("/projects", toSnakeCase(data));
    return unwrap(res);
  },

  async updateProject(id: number, patch: Record<string, unknown>): Promise<Project> {
    const res = await authApi.put<Project>(`/projects/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteProject(id: number, reason: string): Promise<void> {
    await authApi.delete(`/projects/${id}`, { reason });
  },

  /* ------------------------------ CONTRACTS ------------------------------ */
  async contracts(params?: ListParams): Promise<Paged<import("@/types").Contract>> {
    const res = await authApi.get<import("@/types").Contract[]>("/contracts", toQuery(params));
    return asPaged(res);
  },

  async createContract(data: Record<string, unknown>): Promise<import("@/types").Contract> {
    const res = await authApi.post<import("@/types").Contract>("/contracts", toSnakeCase(data));
    return unwrap(res);
  },

  async uploadContractSigned(
    id: number,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<import("@/types").Contract> {
    return this.upload(`/contracts/${id}/signed`, file, onProgress);
  },

  contractFileUrl(id: number): string {
    return `/api/contracts/${id}/download`;
  },

  /* ------------------------------ RENTALS ------------------------------ */
  async rentals(params?: ListParams): Promise<Paged<RentalBilling>> {
    const res = await authApi.get<RentalBilling[]>("/rentals", toQuery(params));
    return asPaged(res);
  },

  async setRentalStatus(id: number, status: string): Promise<void> {
    await authApi.patch(`/rentals/${id}/status`, { status });
  },

  async generateRentalInvoice(id: number, options?: { force?: boolean }): Promise<Invoice> {
    const res = await authApi.post<Invoice>(`/rentals/${id}/generate-invoice`, {
      force: options?.force ?? true,
    });
    return unwrap(res);
  },

  async chargeAllRentals(options?: { force?: boolean }): Promise<{
    generated: number;
    skipped: number;
    errors: Array<{ billingId: number; message: string }>;
  }> {
    const res = await authApi.post<{
      generated: number;
      skipped: number;
      errors: Array<{ billingId: number; message: string }>;
    }>("/rentals/charge-all", { force: options?.force ?? true });
    return unwrap(res);
  },

  /* ------------------------------ INVOICES ------------------------------ */
  async invoices(params?: ListParams): Promise<Paged<Invoice>> {
    const res = await authApi.get<Invoice[]>("/invoices", toQuery(params));
    const paged = asPaged(res);
    return {
      ...paged,
      rows: paged.rows.map((inv) => ({
        ...inv,
        balance: Math.max(0, Number(inv.totalAmount ?? 0) - Number(inv.paidAmount ?? 0)),
        attachments: inv.attachments ?? [],
        timeline: inv.timeline ?? [],
        items: inv.items ?? [],
      })),
    };
  },

  async invoice(id: number): Promise<Invoice> {
    const raw = await authApi.get<InvoiceDetailRaw>(`/invoices/${id}`);
    const inv = unwrap(raw);
    const paid = Number(inv.paidAmount ?? 0);
    const total = Number(inv.totalAmount ?? 0);
    return {
      ...inv,
      customerName: inv.customerName ?? "",
      projectName: "",
      paidAmount: paid,
      balance: Math.max(0, total - paid),
      items: inv.items ?? [],
      attachments: (inv.attachments as unknown as Invoice["attachments"]) ?? [],
      timeline: [
        {
          id: -1,
          title: "Invoice created",
          description: `Invoice ${inv.invoiceNumber} was created`,
          date: inv.invoiceDate,
          type: "created",
        },
        ...(inv.allocations ?? []).map((a, i) => ({
          id: a.allocationId ?? i,
          title: `Payment received — ${a.paymentNumber}`,
          description: `${a.paymentNumber} on ${a.paymentDate}`,
          date: a.paymentDate,
          type: "payment" as const,
        })),
      ],
    };
  },

  async createInvoice(data: unknown): Promise<Invoice> {
    const res = await authApi.post<Invoice>("/invoices", toSnakeCase(data));
    return unwrap(res);
  },

  async updateInvoice(id: number, patch: unknown): Promise<Invoice> {
    const res = await authApi.put<Invoice>(`/invoices/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async setInvoiceStatus(id: number, status: string): Promise<Invoice> {
    const res = await authApi.patch<Invoice>(`/invoices/${id}/status`, { status });
    return unwrap(res);
  },

  async deleteInvoice(id: number, reason: string): Promise<void> {
    await authApi.delete(`/invoices/${id}`, { reason });
  },

  async invoicePdfUrl(id: number): Promise<string> {
    return `/api/invoices/${id}/pdf`;
  },

  async uploadInvoiceAttachment(id: number, file: File, onProgress?: (p: number) => void) {
    return this.upload(`/invoices/${id}/attachments`, file, onProgress);
  },

  async deleteInvoiceAttachment(id: number, attachmentId: number): Promise<void> {
    await authApi.delete(`/invoices/${id}/attachments/${attachmentId}`);
  },

  /* ------------------------------ PAYMENTS ------------------------------ */
  async payments(params?: ListParams): Promise<Paged<Payment>> {
    const res = await authApi.get<Payment[]>("/payments", toQuery(params));
    return asPaged(res);
  },

  async createPayment(data: unknown): Promise<Payment> {
    const res = await authApi.post<Payment>("/payments", toSnakeCase(data));
    return unwrap(res);
  },

  async voidPayment(id: number, reason: string): Promise<void> {
    await authApi.post(`/payments/${id}/void`, { reason });
  },

  async uploadPaymentAttachment(id: number, file: File, onProgress?: (p: number) => void) {
    return this.upload(`/payments/${id}/attachments`, file, onProgress);
  },

  async deletePaymentAttachment(id: number, attachmentId: number): Promise<void> {
    await authApi.delete(`/payments/${id}/attachments/${attachmentId}`);
  },

  /* ------------------------------ EXPENSES ------------------------------ */
  async expenses(params?: ListParams): Promise<Paged<Expense>> {
    const res = await authApi.get<Expense[]>("/expenses", toQuery(params));
    return asPaged(res);
  },

  async expenseCategories(): Promise<Array<{ id: number; name: string }>> {
    const res = await authApi.get<Array<{ expenseCategoryId: number; categoryName: string }>>(
      "/expenses/categories"
    );
    return unwrap(res).map((c) => ({
      id: c.expenseCategoryId ?? (c as unknown as { id: number }).id,
      name: c.categoryName ?? (c as unknown as { name: string }).name,
    }));
  },

  async createExpenseCategory(name: string): Promise<{ id: number; name: string }> {
    const res = await authApi.post<{ expenseCategoryId: number; categoryName: string }>(
      "/expenses/categories",
      { name }
    );
    const c = unwrap(res);
    return { id: c.expenseCategoryId, name: c.categoryName };
  },

  async createExpense(data: Record<string, unknown>): Promise<Expense> {
    const res = await authApi.post<Expense>("/expenses", toSnakeCase(data));
    return unwrap(res);
  },

  async updateExpense(id: number, patch: Record<string, unknown>): Promise<Expense> {
    const res = await authApi.put<Expense>(`/expenses/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteExpense(id: number, reason: string): Promise<void> {
    await authApi.delete(`/expenses/${id}`, { reason });
  },

  async uploadExpenseAttachment(id: number, file: File, onProgress?: (p: number) => void) {
    return this.upload(`/expenses/${id}/attachments`, file, onProgress);
  },

  async deleteExpenseAttachment(id: number, attachmentId: number): Promise<void> {
    await authApi.delete(`/expenses/${id}/attachments/${attachmentId}`);
  },

  /* ------------------------------ INCOME ------------------------------ */
  async income(params?: ListParams): Promise<Paged<Record<string, unknown>>> {
    const res = await authApi.get<Record<string, unknown>[]>("/income", toQuery(params));
    return asPaged(res);
  },

  async incomeCategories(): Promise<Array<{ id: number; name: string }>> {
    const res = await authApi.get<Array<{ incomeCategoryId: number; categoryName: string }>>(
      "/income/categories"
    );
    return unwrap(res).map((c) => ({ id: c.incomeCategoryId, name: c.categoryName }));
  },

  /* ------------------------------ CONTRIBUTIONS ------------------------------ */
  async dueBatches(params?: ListParams): Promise<Paged<DueBatch>> {
    const res = await authApi.get<DueBatch[]>("/contributions/batches", toQuery(params));
    return asPaged(res);
  },

  async dueBatch(id: number): Promise<{ batch: DueBatch; dues: MemberDue[] }> {
    const res = await authApi.get<{ batch: DueBatch; dues: MemberDue[] } | DueBatch>(
      `/contributions/batches/${id}`
    );
    const data = unwrap(res);
    const normalizeDue = (d: MemberDue): MemberDue => ({
      ...d,
      paidAmount: Number(d.paidAmount ?? 0),
      amount: Number(d.amount ?? 0),
      balance: Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0)),
      attachmentCount: Number(d.attachmentCount ?? 0),
    });
    if (data && typeof data === "object" && "batch" in data) {
      const wrapped = data as { batch: DueBatch; dues: MemberDue[] };
      return { batch: wrapped.batch, dues: (wrapped.dues ?? []).map(normalizeDue) };
    }
    const batch = data as DueBatch;
    const dues = (batch.dues ?? []).map(normalizeDue);
    return { batch: { ...batch, dues }, dues };
  },

  async memberDues(params?: ListParams): Promise<Paged<MemberDue>> {
    const res = await authApi.get<MemberDue[]>("/contributions/dues", toQuery(params));
    const paged = asPaged(res);
    return {
      ...paged,
      rows: paged.rows.map((d) => ({
        ...d,
        paidAmount: Number(d.paidAmount ?? 0),
        amount: Number(d.amount ?? 0),
        balance: Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0)),
      })),
    };
  },

  async generateBatch(month: number, year: number, defaultAmount: number): Promise<DueBatch> {
    const res = await authApi.post<DueBatch>("/contributions/batches", {
      month,
      year,
      default_amount: defaultAmount,
    });
    return unwrap(res);
  },

  async receiveDue(dueId: number, amount: number): Promise<MemberDue> {
    const res = await authApi.post<MemberDue>(`/contributions/dues/${dueId}/receive`, { amount });
    return unwrap(res);
  },

  async contributionAttachments(dueId: number) {
    const res = await authApi.get<Attachment[]>(`/contributions/dues/${dueId}/attachments`);
    return unwrap(res);
  },

  async uploadContributionAttachment(dueId: number, file: File, onProgress?: (p: number) => void) {
    return this.upload(`/contributions/dues/${dueId}/attachments`, file, onProgress);
  },

  /* ------------------------------ TRANSACTIONS ------------------------------ */
  async transactions(params?: ListParams): Promise<Paged<LedgerTransaction>> {
    const res = await authApi.get<LedgerTransaction[]>("/transactions", toQuery(params));
    return asPaged(res);
  },

  async transactionSummary(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>("/transactions/summary", toQuery(params));
    return unwrap(res);
  },

  /* ------------------------------ REPORTS ------------------------------ */
  async incomeStatement(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>("/reports/income-statement", toQuery(params));
    return unwrap(res);
  },

  async monthlyRevenue(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>("/reports/monthly-revenue", toQuery(params));
    return unwrap(res);
  },

  async cashFlow(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>("/reports/cash-flow", toQuery(params));
    return unwrap(res);
  },

  async rentalRevenue(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>("/reports/rental-revenue", toQuery(params));
    return unwrap(res);
  },

  async outstandingCustomers(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>(
      "/reports/outstanding-customers",
      toQuery(params)
    );
    return unwrap(res);
  },

  async expenseByCategory(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>(
      "/reports/expenses-by-category",
      toQuery(params)
    );
    return unwrap(res);
  },

  async contributionReport(batchId: number) {
    const res = await authApi.get<Record<string, unknown>>(`/reports/contributions/${batchId}`);
    return unwrap(res);
  },

  async projectReport(params?: ListParams) {
    const res = await authApi.get<Record<string, unknown>>("/reports/projects", toQuery(params));
    return unwrap(res);
  },

  async exportReportUrl(kind: string, format: "pdf" | "xlsx", params?: ListParams): Promise<string> {
    const query = new URLSearchParams();
    query.set("format", format);
    const mapped = toQuery(params);
    if (mapped) {
      for (const [key, value] of Object.entries(mapped)) query.set(key, String(value));
    }
    return `/api/reports/export/${kind}?${query.toString()}`;
  },

  /* ------------------------------ TRASH ------------------------------ */
  async trash(params?: ListParams & { entityType?: string }): Promise<Paged<TrashItem>> {
    const res = await authApi.get<TrashItem[]>("/trash", toQuery(params));
    return asPaged(res);
  },

  async restoreTrash(id: number): Promise<void> {
    await authApi.post(`/trash/${id}/restore`);
  },

  /* ------------------------------ SETTINGS ------------------------------ */
  async settings(): Promise<AppSettings> {
    const res = await authApi.get<AppSettings>("/settings");
    return unwrap(res);
  },

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const res = await authApi.put<AppSettings>("/settings", toSnakeCase(patch));
    return unwrap(res);
  },

  /* ------------------------------ UPLOADS ------------------------------ */
  async upload<T = unknown>(
    url: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    const res = await authApi.upload<T>(url, form, onProgress);
    return unwrap(res);
  },

  /** Authenticated file URL for downloads (proxied via Vite in development). */
  fileUrl(type: string, filename: string): string {
    return `/api/files/${type}/${encodeURIComponent(filename)}`;
  },
};

export type FinanceService = typeof financeService;
