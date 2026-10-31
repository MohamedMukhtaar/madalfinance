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

