import { authApi as http } from "../api";
import type { Payment } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged } from "./helpers";

export const paymentsApi = {
  /* ------------------------------ PAYMENTS ------------------------------ */
  async payments(params?: ListParams): Promise<Paged<Payment>> {
    const res = await http.get<Payment[]>("/payments", toQuery(params));
    return asPaged(res);
  },

  async payment(id: number): Promise<Payment> {
    const res = await http.get<Payment>(`/payments/${id}`);
    return unwrap(res);
  },

  async createPayment(data: unknown): Promise<Payment> {
    const res = await http.post<Payment>("/payments", toSnakeCase(data));
    return unwrap(res);
  },

  async updatePayment(id: number, data: unknown): Promise<Payment> {
    const res = await http.put<Payment>(`/payments/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async voidPayment(id: number, reason: string): Promise<void> {
    await http.post(`/payments/${id}/void`, { reason });
  },

  async uploadPaymentAttachment(id: number, file: File, onProgress?: (p: number) => void) {
    return uploadFile(`/payments/${id}/attachments`, file, onProgress);
  },

  async deletePaymentAttachment(id: number, attachmentId: number): Promise<void> {
    await http.delete(`/payments/${id}/attachments/${attachmentId}`);
  },

};
