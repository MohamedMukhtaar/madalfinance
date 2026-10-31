import {
  useMutation,
  useQuery,
  useQueryClient,
  financeService,
  qk,
  toastErr,
  toast,
  splitQuery,
  type QueryOpts,
} from "./shared";

export function useTasks(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.tasks(query),
    queryFn: () => financeService.tasks({ perPage: 100, sort: "due_date:asc", ...query }),
    enabled,
  });
}

export function useTaskStats(enabled = true) {
  return useQuery({
    queryKey: qk.taskStats,
    queryFn: () => financeService.taskStats(),
    enabled,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createTask>[0]) => financeService.createTask(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.taskStats });
      const count = Array.isArray(result) ? result.length : 1;
      toast.success(count > 1 ? `${count} tasks assigned` : "Task assigned");
    },
    onError: (err) => toastErr(err, "Failed to create task"),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof financeService.updateTask>[1] }) =>
      financeService.updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.taskStats });
      toast.success("Task updated");
    },
    onError: (err) => toastErr(err, "Failed to update task"),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.taskStats });
      toast.success("Task removed");
    },
    onError: (err) => toastErr(err, "Failed to delete task"),
  });
}
