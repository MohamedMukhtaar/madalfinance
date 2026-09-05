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
  projectTemplates: ["project-templates"] as const,
  rentals: (params?: ListParams) => ["rentals", params] as const,
  invoices: (params?: ListParams) => ["invoices", params] as const,
  invoice: (id: number) => ["invoices", id] as const,
  payments: (params?: ListParams) => ["payments", params] as const,
  dues: (params?: ListParams) => ["dues", params] as const,
  duesDetail: (id: number) => ["dues", id] as const,
  expenses: (params?: ListParams) => ["expenses", params] as const,
  expenseCategories: ["expense-categories"] as const,
  accounts: ["accounts"] as const,
  accountStatement: (id: number, params?: ListParams) => ["accounts", id, "statement", params] as const,
  transactions: (params?: ListParams) => ["transactions", params] as const,
  members: ["members"] as const,
  employees: (params?: ListParams) => ["employees", params] as const,
  employeeOrg: (kind: string) => ["employee-org", kind] as const,
  salaryCharges: (params?: ListParams) => ["salary-charges", params] as const,
  salaryPayments: (params?: ListParams) => ["salary-payments", params] as const,
  income: (params?: ListParams) => ["income", params] as const,
  incomeCategories: ["income-categories"] as const,
  users: (params?: ListParams) => ["users", params] as const,
  roles: ["roles"] as const,
  auditLogs: (params?: ListParams) => ["audit-logs", params] as const,
  settings: ["settings"] as const,
  reports: {
    incomeStatement: ["reports", "income-statement"] as const,
    outstanding: ["reports", "outstanding"] as const,
    customerPayment: ["reports", "customer-payment"] as const,
    expenses: ["reports", "expenses"] as const,
    contributions: (batchId?: number) => ["reports", "contributions", batchId] as const,
    monthly: ["reports", "monthly"] as const,
    cashFlow: ["reports", "cash-flow"] as const,
  },
};

function toastErr(err: unknown, fallback: string) {
  toast.error(getErrorMessage(err, fallback));
}

type QueryOpts = ListParams & { enabled?: boolean };

function splitQuery(params?: QueryOpts) {
  const { enabled = true, ...rest } = params ?? {};
  return { enabled, params: rest };
}

/* ------------------------------ DASHBOARD ------------------------------ */
export function useDashboard(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: qk.dashboard(params),
    queryFn: () => financeService.dashboard(params),
  });
}

/* ------------------------------ CUSTOMERS ------------------------------ */
export function useCustomers(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.customers(query),
    queryFn: () => financeService.customers(query ?? { perPage: 100 }),
    enabled,
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
export function useProjects(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.projects(query),
    queryFn: () => financeService.projects(Object.keys(query).length ? query : { perPage: 100 }),
    enabled,
  });
}

export function useProjectTypes() {
  return useQuery({
    queryKey: ["project-types"],
    queryFn: () => financeService.projectTypes(),
  });
}

export function useProjectTemplates(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.projectTemplates, query],
    queryFn: () => financeService.projectTemplates(Object.keys(query).length ? query : undefined),
    enabled,
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createProjectTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Project registered");
    },
    onError: (err) => toastErr(err, "Failed to register project"),
  });
}

export function useUpdateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      financeService.updateProjectTemplate(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Registered project updated");
    },
    onError: (err) => toastErr(err, "Failed to update registered project"),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteProjectTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Registered project deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete registered project"),
  });
}

export function useUploadProjectTemplateLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadProjectTemplateLogo(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Logo uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload logo"),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Customer project created");
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

export function useUploadProjectLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadProjectLogo(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project logo uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload logo"),
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadCompanyLogo(file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Company logo uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload logo"),
  });
}

export function useRemoveCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => financeService.removeCompanyLogo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Company logo removed");
    },
    onError: (err) => toastErr(err, "Failed to remove logo"),
  });
}

export function useUploadProjectAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadProjectAttachment(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Attachment uploaded — project marked completed");
    },
    onError: (err) => toastErr(err, "Failed to upload attachment"),
  });
}

/* ------------------------------ RENTALS ------------------------------ */
export function useRentals(params?: ListParams) {
  return useQuery({
    queryKey: qk.rentals(params),
    queryFn: () => financeService.rentals(params ?? { perPage: 100 }),
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: number;
      monthlyAmount: number;
      setupFee?: number;
      billingDay: number;
      nextBillingDate?: string;
    }) => financeService.createRental(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Rental billing created");
    },
    onError: (err) => toastErr(err, "Failed to create rental"),
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
    mutationFn: ({
      id,
      force = true,
      month,
      year,
    }: {
      id: number;
      force?: boolean;
      month: number;
      year: number;
    }) => financeService.generateRentalInvoice(id, { force, month, year }),
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
    mutationFn: (opts: { force?: boolean; month: number; year: number }) =>
      financeService.chargeAllRentals(opts),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      const errCount = result.errors?.length ?? 0;
      if (result.generated > 0) {
        toast.success(
          `Charged ${result.generated} rental${result.generated === 1 ? "" : "s"}${
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
export function useInvoices(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.invoices(query),
    queryFn: () => financeService.invoices(query ?? { perPage: 100 }),
    enabled,
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
export function usePayments(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.payments(query),
    queryFn: () => financeService.payments({ sort: "created_at:desc", perPage: 100, ...query }),
    enabled,
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
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success(`Payment ${payment.paymentNumber} recorded`);
    },
    onError: (err) => toastErr(err, "Failed to record payment"),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      amount?: number;
      accId?: number;
      paymentDate?: string;
      paymentMethod?: string;
      referenceNumber?: string | null;
      notes?: string | null;
    }) => financeService.updatePayment(id, data),
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success(`Payment ${payment.paymentNumber} updated`);
    },
    onError: (err) => toastErr(err, "Failed to update payment"),
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
export function useDues(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.dues(query),
    queryFn: () => financeService.dueBatches({ perPage: 100, sort: "batch_id:desc", ...query }),
    enabled,
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
      accId,
      receipt,
    }: {
      dueId: number;
      amount: number;
      accId?: number;
      receipt?: File | null;
    }) => {
      const due = await financeService.receiveDue(dueId, amount, accId);
      if (receipt) {
        await financeService.uploadContributionAttachment(dueId, receipt);
      }
      return due;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Contribution received");
    },
    onError: (err) => toastErr(err, "Failed to receive contribution"),
  });
}

export function useGrantMemberCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      amount,
      accId,
      notes,
      creditDate,
    }: {
      memberId: number;
      amount: number;
      accId?: number;
      notes?: string;
      creditDate?: string;
    }) => financeService.grantMemberCredit(memberId, { amount, accId, notes, creditDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: qk.members });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.reports.cashFlow });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports", "member-statement"] });
      toast.success("Member loan recorded");
    },
    onError: (err) => toastErr(err, "Failed to record loan"),
  });
}

export function useRepayMemberLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      amount,
      accId,
      notes,
      repayDate,
    }: {
      memberId: number;
      amount: number;
      accId?: number;
      notes?: string;
      repayDate?: string;
    }) => financeService.repayMemberLoan(memberId, { amount, accId, notes, repayDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: qk.members });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.reports.cashFlow });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports", "member-statement"] });
      toast.success("Loan repayment recorded");
    },
    onError: (err) => toastErr(err, "Failed to record repayment"),
  });
}

export function useApplyMemberCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dueId, amount }: { dueId: number; amount?: number }) =>
      financeService.applyMemberCredit(dueId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      toast.success("Member credit applied");
    },
    onError: (err) => toastErr(err, "Failed to apply credit"),
  });
}

/* ------------------------------ USERS (SUPER ADMIN) ------------------------------ */
export function useUsers(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.users(query),
    queryFn: () => financeService.users(query ?? { perPage: 50 }),
    enabled,
  });
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: qk.roles,
    queryFn: () => financeService.roles(),
    enabled,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createRole>[0]) => financeService.createRole(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles });
      toast.success("Role created");
    },
    onError: (err) => toastErr(err, "Failed to create role"),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof financeService.updateRole>[1] }) =>
      financeService.updateRole(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role updated");
    },
    onError: (err) => toastErr(err, "Failed to update role"),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles });
      toast.success("Role deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete role"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createUser>[0]) => financeService.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    },
    onError: (err) => toastErr(err, "Failed to create user"),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof financeService.updateUser>[1] }) =>
      financeService.updateUser(id, data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      return user;
    },
    onError: (err) => toastErr(err, "Failed to update user"),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => financeService.deleteUser(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("User moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete user"),
  });
}

export function useAuditLogs(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.auditLogs(query),
    queryFn: () => financeService.auditLogs(query ?? { perPage: 25, sort: "created_at:desc" }),
    enabled,
    staleTime: 30_000,
  });
}

/* ------------------------------ MEMBERS ------------------------------ */
export function useMembers(params?: QueryOpts) {
  const { enabled } = splitQuery(params);
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
    enabled,
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

/* ------------------------------ EMPLOYEES / SALARY ------------------------------ */
export function useEmployees(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.employees(query),
    queryFn: () => financeService.employees({ perPage: 100, sort: "first_name:asc", ...query }),
    enabled,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createEmployee>[0]) => financeService.createEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created");
    },
    onError: (err) => toastErr(err, "Failed to create employee"),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof financeService.updateEmployee>[1] }) =>
      financeService.updateEmployee(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
    },
    onError: (err) => toastErr(err, "Failed to update employee"),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee removed");
    },
    onError: (err) => toastErr(err, "Failed to remove employee"),
  });
}

export function useEmployeeOrg(kind: import("@/types").EmployeeOrgKind, enabled = true) {
  return useQuery({
    queryKey: qk.employeeOrg(kind),
    queryFn: () => financeService.employeeOrg(kind),
    enabled,
  });
}

export function useCreateEmployeeOrg(kind: import("@/types").EmployeeOrgKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createEmployeeOrg>[1]) =>
      financeService.createEmployeeOrg(kind, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-org"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Created");
    },
    onError: (err) => toastErr(err, "Failed to create"),
  });
}

export function useUpdateEmployeeOrg(kind: import("@/types").EmployeeOrgKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof financeService.updateEmployeeOrg>[2] }) =>
      financeService.updateEmployeeOrg(kind, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-org"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Updated");
    },
    onError: (err) => toastErr(err, "Failed to update"),
  });
}

export function useDeleteEmployeeOrg(kind: import("@/types").EmployeeOrgKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteEmployeeOrg(kind, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-org"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete"),
  });
}

export function useSalaryCharges(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.salaryCharges(query),
    queryFn: () => financeService.salaryCharges({ perPage: 100, ...query }),
    enabled,
  });
}

export function useCreateSalaryCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createSalaryCharge>[0]) =>
      financeService.createSalaryCharge(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      toast.success("Salary charge created");
    },
    onError: (err) => toastErr(err, "Failed to create salary charge"),
  });
}

export function useGenerateSalaryCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: number; month: number }) => financeService.generateSalaryCharges(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      toast.success(
        result.created
          ? `Generated ${result.created} salary charge${result.created === 1 ? "" : "s"}`
          : "No new charges — all active employees already billed"
      );
    },
    onError: (err) => toastErr(err, "Failed to generate salary charges"),
  });
}

export function useDeleteSalaryCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteSalaryCharge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      toast.success("Salary charge deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete salary charge"),
  });
}

export function usePaySalaryCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof financeService.paySalaryCharge>[1];
    }) => financeService.paySalaryCharge(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      qc.invalidateQueries({ queryKey: ["salary-payments"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Salary payment recorded");
    },
    onError: (err) => toastErr(err, "Failed to record salary payment"),
  });
}

export function useSalaryPayments(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.salaryPayments(query),
    queryFn: () => financeService.salaryPayments({ perPage: 100, sort: "payment_date:desc", ...query }),
    enabled,
  });
}

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

/* ------------------------------ TRANSACTIONS ------------------------------ */
export function useTransactions(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.transactions(query),
    queryFn: () => financeService.transactions({ sort: "created_at:asc", perPage: 100, ...query }),
    enabled,
  });
}

export function useTransactionSummary(params?: ListParams) {
  return useQuery({
    queryKey: ["transactions", "summary", params],
    queryFn: () => financeService.transactionSummary(params),
  });
}

/* ------------------------------ REPORTS ------------------------------ */
export function useIncomeStatement(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.reports.incomeStatement, query],
    queryFn: () => financeService.incomeStatement(query),
    enabled,
  });
}

export function useOutstandingCustomersReport(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.reports.outstanding, query],
    queryFn: () => financeService.outstandingCustomers(query),
    enabled,
  });
}

export function useCustomerPaymentReport(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.reports.customerPayment, query],
    queryFn: () => financeService.customerPaymentStatus(query),
    enabled,
  });
}

export function useExpenseByCategoryReport(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.reports.expenses, query],
    queryFn: () => financeService.expenseByCategory(query),
    enabled,
  });
}

export function useMonthlyRevenueReport(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.reports.monthly, query],
    queryFn: () => financeService.monthlyRevenue(query),
    enabled,
  });
}

export function useCashFlowReport(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.reports.cashFlow, query],
    queryFn: () => financeService.cashFlow(query),
    enabled,
  });
}

export function useContributionReport(batchId: number | undefined, params?: QueryOpts) {
  const { enabled } = splitQuery(params);
  return useQuery({
    queryKey: qk.reports.contributions(batchId),
    queryFn: () => financeService.contributionReport(batchId as number),
    enabled: !!batchId && enabled,
  });
}

export function useMemberStatement(memberId: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: ["reports", "member-statement", memberId, query],
    queryFn: () => financeService.memberStatement({ memberId: memberId as number, ...query }),
    enabled: !!memberId && enabled,
  });
}

export function useCustomerStatement(customerId: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: ["reports", "customer-statement", customerId, query],
    queryFn: () => financeService.reportCustomerStatement({ customerId: customerId as number, ...query }),
    enabled: !!customerId && enabled,
  });
}

export function useProjectStatement(projectId: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: ["reports", "project-statement", projectId, query],
    queryFn: () => financeService.projectStatement({ projectId: projectId as number, ...query }),
    enabled: !!projectId && enabled,
  });
}

export function useExpenseStatement(expenseId: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: ["reports", "expense-statement", expenseId, query],
    queryFn: () => financeService.expenseStatement({ expenseId: expenseId as number, ...query }),
    enabled: !!expenseId && enabled,
  });
}

export function useSalaryStatement(employeeId: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: ["reports", "salary-statement", employeeId, query],
    queryFn: () => financeService.salaryStatement({ employeeId: employeeId as number, ...query }),
    enabled: !!employeeId && enabled,
  });
}

export function useCustomerDetailStatement(customerId: number | undefined, params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: ["customers", customerId, "statement", query],
    queryFn: () => financeService.customerStatement(customerId as number, query),
    enabled: !!customerId && enabled,
  });
}

export type { DueBatch, Invoice, LedgerTransaction, Member, Payment, Project, Expense };
