import { authApi as http, api } from "../api";
import { unwrap, toQuery, type ListParams } from "./helpers";

function buildExportUrl(kind: string, format: "pdf" | "xlsx", params?: ListParams): string {
  const query = new URLSearchParams();
  query.set("format", format);
  const mapped = toQuery(params);
  if (mapped) {
    for (const [key, value] of Object.entries(mapped)) query.set(key, String(value));
  }
  return `/api/reports/export/${kind}?${query.toString()}`;
}

export const reportsApi = {
  /* ------------------------------ REPORTS ------------------------------ */
  async incomeStatement(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>("/reports/income-statement", toQuery(params));
    return unwrap(res);
  },

  async monthlyRevenue(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>("/reports/monthly-revenue", toQuery(params));
    return unwrap(res);
  },

  async cashFlow(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>("/reports/cash-flow", toQuery(params));
    return unwrap(res);
  },

  async rentalRevenue(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>("/reports/rental-revenue", toQuery(params));
    return unwrap(res);
  },

  async outstandingCustomers(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>(
      "/reports/outstanding-customers",
      toQuery(params)
    );
    return unwrap(res);
  },

  async customerPaymentStatus(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>(
      "/reports/customer-payment-status",
      toQuery(params)
    );
    return unwrap(res);
  },

  async expenseByCategory(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>(
      "/reports/expenses-by-category",
      toQuery(params)
    );
    return unwrap(res);
  },

  async contributionReport(batchId: number) {
    const res = await http.get<Record<string, unknown>>(`/reports/contributions/${batchId}`);
    return unwrap(res);
  },

  async projectReport(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>("/reports/projects", toQuery(params));
    return unwrap(res);
  },

  async memberStatement(params: ListParams & { memberId: number }): Promise<import("@/types").MemberStatement> {
    const res = await http.get<import("@/types").MemberStatement>("/reports/member-statement", toQuery(params));
    return unwrap(res);
  },

  async reportCustomerStatement(
    params: ListParams & { customerId: number }
  ): Promise<import("@/types").CustomerStatement> {
    const res = await http.get<import("@/types").CustomerStatement>(
      "/reports/customer-statement",
      toQuery(params)
    );
    return unwrap(res);
  },

  async projectStatement(params: ListParams & { projectId: number }): Promise<import("@/types").ProjectStatement> {
    const res = await http.get<import("@/types").ProjectStatement>("/reports/project-statement", toQuery(params));
    return unwrap(res);
  },

  async expenseStatement(params: ListParams & { expenseId?: number }): Promise<import("@/types").ExpenseStatement> {
    const res = await http.get<import("@/types").ExpenseStatement>("/reports/expense-statement", toQuery(params));
    return unwrap(res);
  },

  async salaryStatement(params: ListParams & { employeeId: number }): Promise<import("@/types").SalaryStatement> {
    const res = await http.get<import("@/types").SalaryStatement>("/reports/salary-statement", toQuery(params));
    return unwrap(res);
  },

  /** Downloads a branded PDF / Excel export (company logo + details from Settings) as a file. */
  async downloadReport(kind: string, format: "pdf" | "xlsx", filenameBase: string, params?: ListParams): Promise<void> {
    const url = buildExportUrl(kind, format, params);
    const response = await api.get<Blob>(url.replace(/^\/api/, ""), { responseType: "blob", timeout: 60000 });
    if (String(response.headers["content-type"] ?? "").includes("application/json")) {
      const parsed = JSON.parse(await response.data.text()) as { message?: string };
      throw new Error(parsed.message || "Export failed");
    }
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  },

  async exportReportUrl(kind: string, format: "pdf" | "xlsx", params?: ListParams): Promise<string> {
    return buildExportUrl(kind, format, params);
  },
};
