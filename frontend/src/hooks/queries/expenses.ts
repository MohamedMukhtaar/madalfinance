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

/* ------------------------------ EXPENSES ------------------------------ */
export function useExpenses(params?: ListParams) {
  return useQuery({
    queryKey: qk.expenses(params),
    queryFn: () => financeService.expenses({ sort: "created_at:desc", perPage: 100, ...params }),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: qk.expenseCategories,
    queryFn: () => financeService.expenseCategories(),
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => financeService.createExpenseCategory(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.expenseCategories });
      toast.success("Category created");
    },
    onError: (err) => toastErr(err, "Failed to create category"),
  });
}

