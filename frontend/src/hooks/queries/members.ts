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

