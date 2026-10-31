import { authApi as http } from "../api";
import type { Expense } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged, type ExpenseChargeRecord } from "./helpers";

export const expensesApi = {
  /* ------------------------------ EXPENSES ------------------------------ */
  async expenses(params?: ListParams): Promise<Paged<Expense>> {
    const res = await http.get<Expense[]>("/expenses", toQuery(params));
    return asPaged(res);
  },

  async expenseCategories(): Promise<Array<{ id: number; name: string }>> {
    const res = await http.get<Array<{ expenseCategoryId: number; categoryName: string }>>(
      "/expenses/categories"
    );
    return unwrap(res).map((c) => ({
      id: c.expenseCategoryId ?? (c as unknown as { id: number }).id,
      name: c.categoryName ?? (c as unknown as { name: string }).name,
    }));
  },

  async createExpenseCategory(name: string): Promise<{ id: number; name: string }> {
    const res = await http.post<{ expenseCategoryId: number; categoryName: string }>(
      "/expenses/categories",
      { name }
    );
    const c = unwrap(res);
    return { id: c.expenseCategoryId, name: c.categoryName };
  },

  async updateExpenseCategory(id: number, name: string): Promise<{ id: number; name: string }> {
    const res = await http.put<{ expenseCategoryId: number; categoryName: string }>(`/expenses/categories/${id}`, { name });
    const c = unwrap(res);
    return { id: c.expenseCategoryId, name: c.categoryName };
  },

  /** Deletes an unused category; a used one is hidden instead (the message says which). */
  async deleteExpenseCategory(id: number): Promise<{ deleted: boolean; hidden: boolean; message: string }> {
    const res = await http.delete<{ deleted: boolean; hidden: boolean }>(`/expenses/categories/${id}`);
    return { ...unwrap(res), message: res.message };
  },

  async expenseCharges(status: "open" | "Paid" | "" = "open"): Promise<ExpenseChargeRecord[]> {
    const res = await http.get<ExpenseChargeRecord[]>("/expenses/charges", status ? { status } : undefined);
    return unwrap(res).map((c) => ({
      ...c,
      amount: Number(c.amount ?? 0),
      paidAmount: Number(c.paidAmount ?? 0),
      balance: Number(c.balance ?? Number(c.amount ?? 0) - Number(c.paidAmount ?? 0)),
    }));
  },

  async createExpenseCharge(data: { expenseCategoryId: number; description: string; amount: number; dueDate: string }) {
    const res = await http.post<ExpenseChargeRecord>("/expenses/charges", toSnakeCase(data));
    return unwrap(res);
  },

  async updateExpenseCharge(
    id: number,
    data: Partial<{ expenseCategoryId: number; description: string; amount: number; dueDate: string }>
  ) {
    const res = await http.put<ExpenseChargeRecord>(`/expenses/charges/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async deleteExpenseCharge(id: number): Promise<void> {
    await http.delete(`/expenses/charges/${id}`);
  },

  async payExpenseCharge(id: number, data: Record<string, unknown>): Promise<Expense> {
    const res = await http.post<Expense>(`/expenses/charges/${id}/pay`, toSnakeCase(data));
    return unwrap(res);
  },

  async createExpense(data: Record<string, unknown>): Promise<Expense> {
    const res = await http.post<Expense>("/expenses", toSnakeCase(data));
    return unwrap(res);
  },

  async updateExpense(id: number, patch: Record<string, unknown>): Promise<Expense> {
    const res = await http.put<Expense>(`/expenses/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteExpense(id: number, reason: string): Promise<void> {
    await http.delete(`/expenses/${id}`, { reason });
  },

  async uploadExpenseAttachment(id: number, file: File, onProgress?: (p: number) => void) {
    return uploadFile(`/expenses/${id}/attachments`, file, onProgress);
  },

  async deleteExpenseAttachment(id: number, attachmentId: number): Promise<void> {
    await http.delete(`/expenses/${id}/attachments/${attachmentId}`);
  },

};
