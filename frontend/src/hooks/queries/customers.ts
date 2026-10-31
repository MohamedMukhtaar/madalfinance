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
import type { Customer } from "@/types";

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

