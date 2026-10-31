import { authApi as http, api } from "../api";
import type { Invoice } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged, type InvoiceDetailRaw } from "./helpers";

export const invoicesApi = {
  /* ------------------------------ INVOICES ------------------------------ */
  async invoices(params?: ListParams): Promise<Paged<Invoice>> {
    const res = await http.get<Invoice[]>("/invoices", toQuery(params));
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
    const raw = await http.get<InvoiceDetailRaw>(`/invoices/${id}`);
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
    const res = await http.post<Invoice>("/invoices", toSnakeCase(data));
    return unwrap(res);
  },

  async updateInvoice(id: number, patch: unknown): Promise<Invoice> {
    const res = await http.put<Invoice>(`/invoices/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async setInvoiceStatus(id: number, status: string): Promise<Invoice> {
    const res = await http.patch<Invoice>(`/invoices/${id}/status`, { status });
    return unwrap(res);
  },

  async deleteInvoice(id: number, reason: string): Promise<void> {
    await http.delete(`/invoices/${id}`, { reason });
  },

  async invoicePdfUrl(id: number): Promise<string> {
    return `/api/invoices/${id}/pdf`;
  },

  async paymentPdfUrl(id: number): Promise<string> {
    return `/api/payments/${id}/pdf`;
  },

  async downloadPaymentPdf(id: number, filename?: string): Promise<void> {
    const response = await api.get(`/payments/${id}/pdf`, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename ?? `payment-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  },

  async downloadInvoicePdf(id: number, filename?: string): Promise<void> {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename ?? `invoice-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  },

  async uploadInvoiceAttachment(id: number, file: File, onProgress?: (p: number) => void) {
    return uploadFile(`/invoices/${id}/attachments`, file, onProgress);
  },

  async deleteInvoiceAttachment(id: number, attachmentId: number): Promise<void> {
    await http.delete(`/invoices/${id}/attachments/${attachmentId}`);
  },

};
