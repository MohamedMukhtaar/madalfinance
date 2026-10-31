import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, Modal, StatCard, confirmDialog } from "@/components/ui";
import { Input } from "@/components/ui/FormField";
import { ExpenseTabs } from "@/features/expenses/ExpenseTabs";
import { useCreateExpenseCategory, useExpenseCategories, useInvalidateExpenses } from "@/hooks/queries";
import { financeService } from "@/services/finance";
import { getErrorMessage } from "@/services/api";

type Category = { id: number; name: string };

const columnHelper = createColumnHelper<Category>();

export default function ExpenseCategoriesPage() {
  const { data: categories = [], isLoading, error, refetch } = useExpenseCategories();
  const createMutation = useCreateExpenseCategory();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const invalidate = useInvalidateExpenses();

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => financeService.updateExpenseCategory(id, name),
    onSuccess: () => {
      invalidate();
      toast.success("Category renamed");
      setEditing(undefined);
    },
    onError: (err) => toast.error(getErrorMessage(err, "Failed to rename category")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeService.deleteExpenseCategory(id),
    onSuccess: (result) => {
      invalidate();
      toast.success(result.message);
    },
    onError: (err) => toast.error(getErrorMessage(err, "Failed to delete category")),
  });

  const columns = useMemo<ColumnDef<Category, any>[]>(
    () => [
      columnHelper.accessor("name", {
        header: "Category",
        cell: (info) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-400">#{info.getValue()}</span>
        ),
      }),
    ],
    []
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ defaultValues: { name: "" } });
  const renameForm = useForm<{ name: string }>({ defaultValues: { name: "" } });
  useEffect(() => {
    if (editing) renameForm.reset({ name: editing.name });
  }, [editing, renameForm]);

  return (
    <div className="space-y-6">
      <ExpenseTabs />
      <PageHeader
        title="Expense Categories"
        subtitle="Organize spending with reusable expense categories."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Add category
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Categories"
          value={String(categories.length)}
          icon={<Tags className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={categories}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        searchPlaceholder="Search categories…"
        emptyTitle="No categories yet"
        emptyDescription="Create your first expense category."
        getRowId={(row) => String(row.id)}
        actions={(row) => [
          { label: "Rename", icon: <Pencil className="h-4 w-4" />, onClick: () => setEditing(row) },
          { divider: true },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: async () => {
              const ok = await confirmDialog({
                title: `Delete "${row.name}"?`,
                text: "If expenses already use this category it is hidden instead, so their history stays intact.",
                confirmText: "Delete",
              });
              if (ok) deleteMutation.mutate(row.id);
            },
          },
        ]}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        title="Rename category"
        subtitle={editing?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button
              loading={renameMutation.isPending}
              onClick={renameForm.handleSubmit((d) => editing && renameMutation.mutate({ id: editing.id, name: d.name.trim() }))}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Category name"
          error={renameForm.formState.errors.name?.message}
          {...renameForm.register("name", { required: "Name is required", minLength: { value: 2, message: "Too short" } })}
        />
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New category"
        subtitle="Categories appear in the expense form."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={isSubmitting}
              onClick={handleSubmit(async (d) => {
                await createMutation.mutateAsync(d.name.trim());
                reset();
                setOpen(false);
              })}
            >
              Create
            </Button>
          </>
        }
      >
        <Input
          label="Category name"
          placeholder="e.g. Hosting"
          error={errors.name?.message}
          {...register("name", { required: "Name is required", minLength: { value: 2, message: "Too short" } })}
        />
      </Modal>
    </div>
  );
}
