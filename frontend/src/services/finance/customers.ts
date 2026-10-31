import { authApi as http } from "../api";
import type { Customer } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";

export const customersApi = {
  /* ------------------------------ CUSTOMERS ------------------------------ */
  async customers(params?: ListParams): Promise<Paged<Customer>> {
    const res = await http.get<Customer[]>("/customers", toQuery(params));
    return asPaged(res);
  },

  async customer(id: number): Promise<Customer> {
    const res = await http.get<Customer>(`/customers/${id}`);
    return unwrap(res);
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await http.post<Customer>("/customers", toSnakeCase(data));
    return unwrap(res);
  },

  async updateCustomer(id: number, patch: Partial<Customer>): Promise<Customer> {
    const res = await http.put<Customer>(`/customers/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteCustomer(id: number, reason: string): Promise<void> {
    await http.delete(`/customers/${id}`, { reason });
  },

  async customerStatement(id: number, params?: ListParams): Promise<import("@/types").CustomerStatement> {
    const res = await http.get<import("@/types").CustomerStatement>(
      `/customers/${id}/statement`,
      toQuery(params)
    );
    return unwrap(res);
  },

};
