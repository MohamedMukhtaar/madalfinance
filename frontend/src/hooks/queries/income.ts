import {
  useMutation,
  useQuery,
  useQueryClient,
  financeService,
  qk,
  toastErr,
  toast,
  getErrorMessage,
  splitQuery,
  patchRentalStatus,
  type QueryOpts,
  type ListParams,
} from "./shared";

/* ------------------------------ OTHER INCOME ------------------------------ */
export function useIncome(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.income(query),
    queryFn: () => financeService.income({ sort: "income_date:desc", perPage: 100, ...query }),
    enabled,
  });
}

export function useIncomeCategories() {
  return useQuery({
    queryKey: qk.incomeCategories,
    queryFn: () => financeService.incomeCategories(),
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createIncome>[0]) => financeService.createIncome(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: qk.incomeCategories });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.reports.incomeStatement });
      qc.invalidateQueries({ queryKey: qk.reports.cashFlow });
      toast.success("Income recorded");
    },
    onError: (err) => toastErr(err, "Failed to record income"),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => financeService.deleteIncome(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: qk.incomeCategories });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.reports.incomeStatement });
      qc.invalidateQueries({ queryKey: qk.reports.cashFlow });
      toast.success("Income moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete income"),
  });
}

