import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Plus, Tags } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, Modal, StatCard } from "@/components/ui";
import { Input } from "@/components/ui/FormField";
import { useCreateExpenseCategory, useExpenseCategories } from "@/hooks/queries";

type Category = { id: number; name: string };

const columnHelper = createColumnHelper<Category>();

export default function ExpenseCategoriesPage() {
  const { data: categories = [], isLoading, error, refetch } = useExpenseCategories();
  const createMutation = useCreateExpenseCategory();
  const [open, setOpen] = useState(false);

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

  return (
    <div className="space-y-6">
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
      />

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
