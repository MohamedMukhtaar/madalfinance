import { authApi as http } from "../api";
import type { LedgerTransaction } from "@/types";
import { unwrap, asPaged, toQuery, type ListParams, type Paged } from "./helpers";

export const transactionsApi = {
  /* ------------------------------ TRANSACTIONS ------------------------------ */
  async transactions(params?: ListParams): Promise<Paged<LedgerTransaction>> {
    const res = await http.get<LedgerTransaction[]>("/transactions", toQuery(params));
    return asPaged(res);
  },

  async transactionSummary(params?: ListParams) {
    const res = await http.get<Record<string, unknown>>("/transactions/summary", toQuery(params));
    return unwrap(res);
  },

};
