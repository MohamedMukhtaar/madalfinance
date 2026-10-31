import { authApi as http } from "../api";
import type { Invoice, Project, RentalBilling } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged } from "./helpers";

export const projectsApi = {
  /* ------------------------------ PROJECTS ------------------------------ */
  async projects(params?: ListParams): Promise<Paged<Project>> {
    const res = await http.get<Project[]>("/projects", toQuery(params));
    return asPaged(res);
  },

  async project(id: number): Promise<Project> {
    const res = await http.get<Project>(`/projects/${id}`);
    return unwrap(res);
  },

  async projectTypes(): Promise<Array<{ id: number; name: string }>> {
    const res = await http.get<Array<{ projectTypeId: number; typeName: string }>>("/projects/types");
    return unwrap(res).map((t) => ({ id: t.projectTypeId, name: t.typeName }));
  },

  async createProject(data: Record<string, unknown>): Promise<Project> {
    const res = await http.post<Project>("/projects", toSnakeCase(data));
    return unwrap(res);
  },

  async updateProject(id: number, patch: Record<string, unknown>): Promise<Project> {
    const res = await http.put<Project>(`/projects/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteProject(id: number, reason: string): Promise<void> {
    await http.delete(`/projects/${id}`, { reason });
  },

  projectLogoUrl(projectId: number, filename: string): string {
    return `/api/files/projects/${encodeURIComponent(filename)}`;
  },

  projectAttachmentUrl(projectId: number, filename: string): string {
    return `/api/files/projects/${encodeURIComponent(filename)}`;
  },

  async uploadProjectLogo(id: number, file: File, onProgress?: (p: number) => void): Promise<Project> {
    return uploadFile<Project>(`/projects/${id}/logo`, file, onProgress);
  },

  async uploadProjectAttachment(id: number, file: File, onProgress?: (p: number) => void): Promise<Project> {
    return uploadFile<Project>(`/projects/${id}/attachment`, file, onProgress);
  },

  /* ------------------------------ PROJECT TEMPLATES ------------------------------ */
  async projectTemplates(params?: ListParams): Promise<import("@/types").ProjectTemplate[]> {
    const res = await http.get<import("@/types").ProjectTemplate[]>("/projects/templates", toQuery(params));
    return unwrap(res);
  },

  async createProjectTemplate(data: Record<string, unknown>): Promise<import("@/types").ProjectTemplate> {
    const res = await http.post<import("@/types").ProjectTemplate>("/projects/templates", toSnakeCase(data));
    return unwrap(res);
  },

  async updateProjectTemplate(id: number, patch: Record<string, unknown>): Promise<import("@/types").ProjectTemplate> {
    const res = await http.put<import("@/types").ProjectTemplate>(`/projects/templates/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteProjectTemplate(id: number): Promise<void> {
    await http.delete(`/projects/templates/${id}`);
  },

  async uploadProjectTemplateLogo(
    id: number,
    file: File,
    onProgress?: (p: number) => void
  ): Promise<import("@/types").ProjectTemplate> {
    return uploadFile<import("@/types").ProjectTemplate>(`/projects/templates/${id}/logo`, file, onProgress);
  },

  /* ------------------------------ CONTRACTS ------------------------------ */
  async contracts(params?: ListParams): Promise<Paged<import("@/types").Contract>> {
    const res = await http.get<import("@/types").Contract[]>("/contracts", toQuery(params));
    return asPaged(res);
  },

  async createContract(data: Record<string, unknown>): Promise<import("@/types").Contract> {
    const res = await http.post<import("@/types").Contract>("/contracts", toSnakeCase(data));
    return unwrap(res);
  },

  async uploadContractSigned(
    id: number,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<import("@/types").Contract> {
    return uploadFile(`/contracts/${id}/signed`, file, onProgress);
  },

  contractFileUrl(id: number): string {
    return `/api/contracts/${id}/download`;
  },

  /* ------------------------------ RENTALS ------------------------------ */
  async rentals(params?: ListParams): Promise<Paged<RentalBilling>> {
    const res = await http.get<RentalBilling[]>("/rentals", toQuery(params));
    return asPaged(res);
  },

  async createRental(data: {
    projectId: number;
    monthlyAmount: number;
    setupFee?: number;
    billingDay: number;
    nextBillingDate?: string;
  }): Promise<RentalBilling> {
    const res = await http.post<RentalBilling>("/rentals", toSnakeCase(data));
    return unwrap(res);
  },

  async setRentalStatus(id: number, status: string): Promise<void> {
    await http.patch(`/rentals/${id}/status`, { status });
  },

  async generateRentalInvoice(
    id: number,
    options?: { force?: boolean; month?: number; year?: number }
  ): Promise<Invoice> {
    const res = await http.post<Invoice>(`/rentals/${id}/generate-invoice`, {
      force: options?.force ?? true,
      ...(options?.month ? { month: options.month } : {}),
      ...(options?.year ? { year: options.year } : {}),
    });
    return unwrap(res);
  },

  async chargeAllRentals(options?: { force?: boolean; month: number; year: number }): Promise<{
    generated: number;
    skipped: number;
    errors: Array<{ billingId: number; message: string }>;
  }> {
    const res = await http.post<{
      generated: number;
      skipped: number;
      errors: Array<{ billingId: number; message: string }>;
    }>("/rentals/charge-all", {
      force: options?.force ?? true,
      month: options!.month,
      year: options!.year,
    });
    return unwrap(res);
  },

};
