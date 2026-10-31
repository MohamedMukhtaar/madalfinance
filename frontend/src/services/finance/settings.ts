import { authApi as http } from "../api";
import type { AppSettings } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, fileUrl, type ListParams, type Paged, type TrashItem } from "./helpers";

export const settingsApi = {
  /* ------------------------------ TRASH ------------------------------ */
  async trash(params?: ListParams & { entityType?: string }): Promise<Paged<TrashItem>> {
    const res = await http.get<TrashItem[]>("/trash", toQuery(params));
    return asPaged(res);
  },

  async restoreTrash(id: number): Promise<void> {
    await http.post(`/trash/${id}/restore`);
  },

  /* ------------------------------ SETTINGS ------------------------------ */
  async settings(): Promise<AppSettings> {
    const res = await http.get<AppSettings>("/settings");
    return unwrap(res);
  },

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const res = await http.put<AppSettings>("/settings", toSnakeCase(patch));
    return unwrap(res);
  },

  async uploadCompanyLogo(file: File, onProgress?: (p: number) => void): Promise<AppSettings> {
    return uploadFile<AppSettings>("/settings/logo", file, onProgress);
  },

  async removeCompanyLogo(): Promise<AppSettings> {
    const res = await http.delete<AppSettings>("/settings/logo");
    return unwrap(res);
  },

  

};
