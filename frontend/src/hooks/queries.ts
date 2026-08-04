import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Customer,
  DueBatch,
  Expense,
  Invoice,
  LedgerTransaction,
  Member,
  Payment,
  Project,
} from "@/types";
import { financeService, type ListParams } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import toast from "react-hot-toast";

export const qk = {
  dashboard: (params?: { year?: number; month?: number }) =>
    ["dashboard", params?.year, params?.month] as const,
  customers: (params?: ListParams) => ["customers", params] as const,
  customer: (id: number) => ["customers", id] as const,
  projects: (params?: ListParams) => ["projects", params] as const,
  rentals: (params?: ListParams) => ["rentals", params] as const,
  invoices: (params?: ListParams) => ["invoices", params] as const,
  invoice: (id: number) => ["invoices", id] as const,
  payments: (params?: ListParams) => ["payments", params] as const,
  dues: (params?: ListParams) => ["dues", params] as const,
  duesDetail: (id: number) => ["dues", id] as const,
  expenses: (params?: ListParams) => ["expenses", params] as const,
  expenseCategories: ["expense-categories"] as const,
  transactions: (params?: ListParams) => ["transactions", params] as const,
  members: ["members"] as const,
  settings: ["settings"] as const,
  reports: {
    incomeStatement: ["reports", "income-statement"] as const,
    outstanding: ["reports", "outstanding"] as const,
    expenses: ["reports", "expenses"] as const,
    contributions: (batchId?: number) => ["reports", "contributions", batchId] as const,
    monthly: ["reports", "monthly"] as const,
    cashFlow: ["reports", "cash-flow"] as const,
  },
};

function toastErr(err: unknown, fallback: string) {
  toast.error(getErrorMessage(err, fallback));
}

/* ------------------------------ DASHBOARD ------------------------------ */
export function useDashboard(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: qk.dashboard(params),
    queryFn: () => financeService.dashboard(params),
  });
}

/* ------------------------------ CUSTOMERS ------------------------------ */
export function useCustomers(params?: ListParams) {
  return useQuery({
    queryKey: qk.customers(params),
    queryFn: () => financeService.customers(params ?? { perPage: 100 }),
  });
}

export function useCustomer(id: number | undefined) {
  return useQuery({
    queryKey: qk.customer(id ?? 0),
    queryFn: () => financeService.customer(id as number),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => financeService.createCustomer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Customer created successfully");
    },
    onError: (err) => toastErr(err, "Failed to create customer"),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Customer> }) =>
      financeService.updateCustomer(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
    },
    onError: (err) => toastErr(err, "Failed to update customer"),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      financeService.deleteCustomer(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Customer moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete customer"),
  });
}

/* ------------------------------ PROJECTS ------------------------------ */
export function useProjects(params?: ListParams) {
  return useQuery({
    queryKey: qk.projects(params),
    queryFn: () => financeService.projects(params ?? { perPage: 100 }),
  });
}

export function useProjectTypes() {
  return useQuery({
    queryKey: ["project-types"],
    queryFn: () => financeService.projectTypes(),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Project created");
    },
    onError: (err) => toastErr(err, "Failed to create project"),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      financeService.updateProject(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Project updated");
    },
    onError: (err) => toastErr(err, "Failed to update project"),
  });
}

/* ------------------------------ RENTALS ------------------------------ */
export function useRentals(params?: ListParams) {
  return useQuery({
    queryKey: qk.rentals(params),
    queryFn: () => financeService.rentals(params ?? { perPage: 100 }),
  });
}

export function useContracts(params?: ListParams) {
  return useQuery({
    queryKey: ["contracts", params],
    queryFn: () => financeService.contracts(params ?? { perPage: 100 }),
  });
}

export function useSetRentalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      financeService.setRentalStatus(id, status),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(vars.status === "Paused" ? "Rental paused" : "Rental updated");
    },
    onError: (err) => toastErr(err, "Failed to update rental"),
  });
}

/** @deprecated use useSetRentalStatus */
export function usePauseRental() {
  const mutation = useSetRentalStatus();
  return {
    ...mutation,
    mutate: (id: number) => mutation.mutate({ id, status: "Paused" }),
    mutateAsync: (id: number) => mutation.mutateAsync({ id, status: "Paused" }),
  };
}

/** @deprecated use useSetRentalStatus */
export function useResumeRental() {
  const mutation = useSetRentalStatus();
  return {
    ...mutation,
    mutate: (id: number) => mutation.mutate({ id, status: "Active" }),
    mutateAsync: (id: number) => mutation.mutateAsync({ id, status: "Active" }),
  };
}

export function useGenerateRentalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force = true }: { id: number; force?: boolean }) =>
      financeService.generateRentalInvoice(id, { force }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("Rental invoice generated");
    },
    onError: (err) => toastErr(err, "Failed to generate rental invoice"),
  });
}

export function useChargeAllRentals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { force?: boolean }) => financeService.chargeAllRentals(opts),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      const errCount = result.errors?.length ?? 0;
      if (result.generated > 0) {
        toast.success(
          `Generated ${result.generated} invoice${result.generated === 1 ? "" : "s"}${
            result.skipped ? ` · ${result.skipped} skipped` : ""
          }`
        );
      } else if (errCount) {
        toast.error(result.errors[0]?.message || "No invoices generated");
      } else {
        toast.success(result.skipped ? `All caught up (${result.skipped} skipped)` : "No due rentals to charge");
      }
    },
    onError: (err) => toastErr(err, "Failed to charge rentals"),
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createContract(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created");
    },
    onError: (err) => toastErr(err, "Failed to create contract"),
  });
}

export function useUploadContractSigned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      onProgress,
    }: {
      id: number;
      file: File;
      onProgress?: (n: number) => void;
    }) => financeService.uploadContractSigned(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Attachment uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload attachment"),
  });
}

/* ------------------------------ INVOICES ------------------------------ */
export function useInvoices(params?: ListParams) {
  return useQuery({
    queryKey: qk.invoices(params),
    queryFn: () => financeService.invoices(params ?? { perPage: 100 }),
  });
}

export function useInvoice(id: number | undefined) {
  return useQuery({
    queryKey: qk.invoice(id ?? 0),
    queryFn: () => financeService.invoice(id as number),
    enabled: !!id,
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => financeService.createInvoice(data),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Invoice ${invoice.invoiceNumber} generated`);
    },
    onError: (err) => toastErr(err, "Failed to generate invoice"),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      financeService.deleteInvoice(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Invoice moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete invoice"),
  });
}

/* ------------------------------ PAYMENTS ------------------------------ */
export function usePayments(params?: ListParams) {
  return useQuery({
    queryKey: qk.payments(params),
    queryFn: () => financeService.payments(params ?? { perPage: 100 }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => financeService.createPayment(data),
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Payment ${payment.paymentNumber} recorded`);
    },
    onError: (err) => toastErr(err, "Failed to record payment"),
  });
}

export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      financeService.voidPayment(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Payment voided and moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to void payment"),
  });
}

/* ------------------------------ CONTRIBUTIONS ------------------------------ */
export function useDues(params?: ListParams) {
  return useQuery({
    queryKey: qk.dues(params),
    queryFn: () => financeService.dueBatches(params ?? { perPage: 50 }),
  });
}

export function useDueBatch(id: number | undefined) {
  return useQuery({
    queryKey: qk.duesDetail(id ?? 0),
    queryFn: () => financeService.dueBatch(id as number),
    enabled: !!id,
  });
}

export function useChargeMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: number; year: number; defaultAmount: number }) =>
      financeService.generateBatch(data.month, data.year, data.defaultAmount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Member contributions generated");
    },
    onError: (err) => toastErr(err, "Failed to generate contributions"),
  });
}

export function useReceiveDue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dueId,
      amount,
      receipt,
    }: {
      dueId: number;
      amount: number;
      receipt?: File | null;
    }) => {
      const due = await financeService.receiveDue(dueId, amount);
      if (receipt) {
        await financeService.uploadContributionAttachment(dueId, receipt);
      }
      return due;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Contribution received");
    },
    onError: (err) => toastErr(err, "Failed to receive contribution"),
  });
}

/* ------------------------------ MEMBERS ------------------------------ */
export function useMembers() {
  return useQuery({
    queryKey: qk.members,
    queryFn: async () => {
      try {
        const paged = await financeService.listMembers({ perPage: 100 });
        return paged.rows;
      } catch {
        return financeService.members();
      }
    },
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      photo,
      ...data
    }: Parameters<typeof financeService.createMember>[0] & { photo?: File | null }) => {
      const member = await financeService.createMember(data);
      if (photo) {
        return financeService.uploadMemberAvatar(member.memberId, photo);
      }
      return member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Member created");
    },
    onError: (err) => toastErr(err, "Failed to create member"),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      photo,
    }: {
      id: number;
      patch: Parameters<typeof financeService.updateMember>[1];
      photo?: File | null;
    }) => {
      const member = await financeService.updateMember(id, patch);
      if (photo) {
        return financeService.uploadMemberAvatar(id, photo);
      }
      return member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Member updated");
    },
    onError: (err) => toastErr(err, "Failed to update member"),
  });
}

export function useDeactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      financeService.deactivateMember(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Member moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete member"),
  });
}

/* ------------------------------ EXPENSES ------------------------------ */
export function useExpenses(params?: ListParams) {
  return useQuery({
    queryKey: qk.expenses(params),
    queryFn: () => financeService.expenses(params ?? { perPage: 100 }),
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

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
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

/* ------------------------------ TRANSACTIONS ------------------------------ */
export function useTransactions(params?: ListParams) {
  return useQuery({
    queryKey: qk.transactions(params),
    queryFn: () => financeService.transactions(params ?? { perPage: 100 }),
  });
}

export function useTransactionSummary(params?: ListParams) {
  return useQuery({
    queryKey: ["transactions", "summary", params],
    queryFn: () => financeService.transactionSummary(params),
  });
}

/* ------------------------------ REPORTS ------------------------------ */
export function useIncomeStatement(params?: ListParams) {
  return useQuery({
    queryKey: [...qk.reports.incomeStatement, params],
    queryFn: () => financeService.incomeStatement(params),
  });
}

export function useOutstandingCustomersReport(params?: ListParams) {
  return useQuery({
    queryKey: [...qk.reports.outstanding, params],
    queryFn: () => financeService.outstandingCustomers(params),
  });
}

export function useExpenseByCategoryReport(params?: ListParams) {
  return useQuery({
    queryKey: [...qk.reports.expenses, params],
    queryFn: () => financeService.expenseByCategory(params),
  });
}

export function useMonthlyRevenueReport(params?: ListParams) {
  return useQuery({
    queryKey: [...qk.reports.monthly, params],
    queryFn: () => financeService.monthlyRevenue(params),
  });
}

export function useCashFlowReport(params?: ListParams) {
  return useQuery({
    queryKey: [...qk.reports.cashFlow, params],
    queryFn: () => financeService.cashFlow(params),
  });
}

export function useContributionReport(batchId: number | undefined) {
  return useQuery({
    queryKey: qk.reports.contributions(batchId),
    queryFn: () => financeService.contributionReport(batchId as number),
    enabled: !!batchId,
  });
}

export type { DueBatch, Invoice, LedgerTransaction, Member, Payment, Project, Expense };
