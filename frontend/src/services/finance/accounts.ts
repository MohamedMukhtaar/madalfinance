import { authApi as http } from "../api";
import { unwrap, toSnakeCase, toQuery } from "./helpers";

export const accountsApi = {
  /* ------------------------------ ACCOUNTS ------------------------------ */
  async accounts(): Promise<import("@/types").Account[]> {
    const res = await http.get<import("@/types").Account[]>("/accounts");
    return unwrap(res);
  },

  async defaultAccount(): Promise<import("@/types").Account | null> {
    const res = await http.get<import("@/types").Account | null>("/accounts/default");
    return unwrap(res);
  },

  async createAccount(data: {
    number: string;
    institution: string;
    balance?: number;
    isDefault?: boolean;
  }): Promise<import("@/types").Account> {
    const res = await http.post<import("@/types").Account>("/accounts", toSnakeCase(data));
    return unwrap(res);
  },

  async updateAccount(id: number, data: { number: string; institution: string }): Promise<import("@/types").Account> {
    const res = await http.patch<import("@/types").Account>(`/accounts/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async deleteAccount(id: number): Promise<void> {
    await http.delete(`/accounts/${id}`);
  },

  async deleteTransfer(id: number, reason: string): Promise<void> {
    await http.delete(`/accounts/transfers/${id}`, { reason });
  },

  async updateIncome(
    id: number,
    data: { accId?: number; categoryName?: string; description?: string; amount?: number; incomeDate?: string; notes?: string }
  ) {
    const res = await http.put<import("@/types").OtherIncome>(`/income/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async setDefaultAccount(id: number): Promise<import("@/types").Account> {
    const res = await http.patch<import("@/types").Account>(`/accounts/${id}/default`);
    return unwrap(res);
  },

  async transferAccount(data: {
    fromAccId: number;
    toAccId: number;
    amount: number;
    transferDate: string;
    notes?: string;
  }): Promise<void> {
    await http.post("/accounts/transfer", toSnakeCase(data));
  },

  async accountTransfers(params?: { fromDate?: string; toDate?: string; accId?: number }): Promise<import("@/types").AccountTransfer[]> {
    const res = await http.get<import("@/types").AccountTransfer[]>("/accounts/transfers", toQuery(params));
    return unwrap(res);
  },

  async accountStatement(
    id: number,
    params?: { fromDate?: string; toDate?: string }
  ): Promise<{ account: import("@/types").Account; movements: import("@/types").AccountMovement[] }> {
    const res = await http.get<{ account: import("@/types").Account; movements: import("@/types").AccountMovement[] }>(
      `/accounts/${id}/statement`,
      toQuery(params)
    );
    return unwrap(res);
  },

};
