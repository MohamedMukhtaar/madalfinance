import { authApi as http } from "../api";
import type { PerformanceTask, TaskStats } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";

export const tasksApi = {
  async tasks(params?: ListParams): Promise<Paged<PerformanceTask>> {
    const res = await http.get<PerformanceTask[]>("/tasks", toQuery(params));
    return asPaged(res);
  },

  async taskStats(): Promise<TaskStats> {
    const res = await http.get<TaskStats>("/tasks/stats");
    return unwrap(res);
  },

  async task(id: number): Promise<PerformanceTask> {
    const res = await http.get<PerformanceTask>(`/tasks/${id}`);
    return unwrap(res);
  },

  async createTask(data: {
    title: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    assigneeType: "employee" | "member";
    employeeId?: number | null;
    memberId?: number | null;
    employeeIds?: number[];
    memberIds?: number[];
  }): Promise<PerformanceTask | PerformanceTask[]> {
    const res = await http.post<PerformanceTask | PerformanceTask[]>("/tasks", toSnakeCase(data));
    return unwrap(res);
  },

  async updateTask(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      priority: string;
      status: string;
      dueDate: string | null;
      assigneeType: "employee" | "member";
      employeeId: number | null;
      memberId: number | null;
    }>
  ): Promise<PerformanceTask> {
    const res = await http.put<PerformanceTask>(`/tasks/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async deleteTask(id: number): Promise<void> {
    await http.delete(`/tasks/${id}`);
  },
};
