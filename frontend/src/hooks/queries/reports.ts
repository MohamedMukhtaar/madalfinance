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
    queryKey: ["reports", "expense-statement", expenseId ?? 0, query],
    queryFn: () =>
      financeService.expenseStatement({
        ...(expenseId ? { expenseId } : {}),
        ...query,
      }),
    enabled,
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


