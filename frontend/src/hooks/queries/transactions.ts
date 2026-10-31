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

