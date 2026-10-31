import { authApi as http } from "../api";
import type { OtherIncome } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";

export const incomeApi = {
  /* ------------------------------ INCOME ------------------------------ */
  async income(params?: ListParams): Promise<Paged<OtherIncome>> {
    const res = await http.get<OtherIncome[]>("/income", toQuery(params));
    return asPaged(res);
  },

  async incomeCategories(): Promise<Array<{ name: string }>> {
    const res = await http.get<Array<{ categoryName: string }>>("/income/categories");
    return (unwrap(res) ?? []).map((c) => ({ name: c.categoryName })).filter((c) => c.name);
  },

  async createIncome(data: {
    categoryName?: string;
    description?: string;
    amount: number;
    incomeDate: string;
    accId?: number;
    notes?: string;
  }): Promise<OtherIncome> {
    const res = await http.post<OtherIncome>("/income", toSnakeCase(data));
    return unwrap(res);
  },

  async deleteIncome(id: number, reason: string): Promise<void> {
    await http.delete(`/income/${id}`, { reason });
  },

};
