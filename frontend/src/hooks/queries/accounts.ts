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

/* ------------------------------ ACCOUNTS ------------------------------ */
export function useAccounts(params?: QueryOpts) {
  const { enabled } = splitQuery(params);
  return useQuery({
    queryKey: qk.accounts,
    queryFn: () => financeService.accounts(),
    enabled,
  });
}

export function useDefaultAccount() {
  return useQuery({
    queryKey: [...qk.accounts, "default"],
    queryFn: () => financeService.defaultAccount(),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { number: string; institution: string; balance?: number; isDefault?: boolean }) =>
      financeService.createAccount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Account created");
    },
    onError: (err) => toastErr(err, "Failed to create account"),
  });
}

export function useSetDefaultAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.setDefaultAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Default account updated");
    },
    onError: (err) => toastErr(err, "Failed to set default account"),
  });
}

export function useTransferAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromAccId: number; toAccId: number; amount: number; transferDate: string; notes?: string }) =>
      financeService.transferAccount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: [...qk.accounts, "transfers"] });
      toast.success("Transfer completed");
    },
    onError: (err) => toastErr(err, "Transfer failed"),
  });
}

export function useAccountTransfers(params?: { fromDate?: string; toDate?: string; accId?: number }) {
  return useQuery({
    queryKey: [...qk.accounts, "transfers", params],
    queryFn: () => financeService.accountTransfers(params),
  });
}

export function useAccountStatement(id: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.accountStatement(id ?? 0, query),
    queryFn: () => financeService.accountStatement(id as number, query),
    enabled: !!id && enabled,
  });
}

/** Accounts, ledger, reports and dashboard — after any edit that moves money. */
export function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["income", "transactions", "dashboard", "reports", "trash", "account-transfers", "salary", "expenses"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
    qc.invalidateQueries({ queryKey: qk.accounts });
    qc.invalidateQueries({ queryKey: qk.incomeCategories });
  };
}

/** Everything that shows expense money: lists, charges, ledger, balances, dashboard. */
export function useInvalidateExpenses() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expense-charges"] });
    qc.invalidateQueries({ queryKey: qk.expenseCategories });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: qk.accounts });
  };
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Expense recorded");
    },
    onError: (err) => toastErr(err, "Failed to record expense"),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      financeService.deleteExpense(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Expense moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete expense"),
  });
}

export function useTrash(params?: ListParams) {
  return useQuery({
    queryKey: ["trash", params],
    queryFn: () => financeService.trash(params ?? { perPage: 100 }),
  });
}

export function useRestoreTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.restoreTrash(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: qk.members });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Item restored");
    },
    onError: (err) => toastErr(err, "Failed to restore item"),
  });
}

