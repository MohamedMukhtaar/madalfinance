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

