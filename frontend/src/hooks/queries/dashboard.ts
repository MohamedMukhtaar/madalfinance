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

/* ------------------------------ DASHBOARD ------------------------------ */
export function useDashboard(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: qk.dashboard(params),
    queryFn: () => financeService.dashboard(params),
  });
}

