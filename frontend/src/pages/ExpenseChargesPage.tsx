import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Banknote, Pencil, Plus, Printer, Receipt, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, Modal, StatCard, confirmDialog } from "@/components/ui";
import { Input, Select } from "@/components/ui/FormField";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import { ExpenseTabs } from "@/features/expenses/ExpenseTabs";
import { useExpenseCategories, useInvalidateExpenses } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService, type ExpenseChargeRecord } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import { formatCurrency, todayISO } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { loadExpenseCharges, saveExpenseCharges } from "@/utils/expenseCharges";
import { printCharge } from "@/utils/print";

const columnHelper = createColumnHelper<ExpenseChargeRecord>();

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300",
  Partial: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300",
};

interface ChargeForm {
  categoryId: string;
  description: string;
  amount: number;
  dueDate: string;
}

/**
 * Bills used to live only in this browser's localStorage. Copy any that are still there
 * into the database once, then clear them, so nothing entered before is lost.
 */
function useMigrateLocalCharges(onDone: () => void) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const local = loadExpenseCharges();
    if (!local.length) return;
    // Clear first so a second visit mid-upload can't copy the same bills twice.
    saveExpenseCharges([]);
    (async () => {
      const failed: typeof local = [];
      for (const c of local) {
        try {
          await financeService.createExpenseCharge({
            expenseCategoryId: c.categoryId,
            description: c.description,
            amount: c.amount,
            dueDate: c.dueDate,
          });
        } catch {
          failed.push(c);
        }
      }
      saveExpenseCharges(failed);
      if (local.length > failed.length) {
        toast.success(`Moved ${local.length - failed.length} saved charge(s) from this browser into the system`);
        onDone();
      }
    })();
  }, [onDone]);
}

export default function ExpenseChargesPage() {
  const { currency, settings } = useSettings();
  const invalidate = useInvalidateExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: charges = [], isLoading, error, refetch } = useQuery({
    queryKey: ["expense-charges", "open"],
    queryFn: () => financeService.expenseCharges("open"),
  });
  useMigrateLocalCharges(invalidate);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseChargeRecord | undefined>();
  const [payFor, setPayFor] = useState<ExpenseChargeRecord | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChargeForm>();

  useEffect(() => {
    if (!formOpen) return;
    reset(
      editing
        ? {
            categoryId: String(editing.expenseCategoryId),
            description: editing.description ?? "",
            amount: editing.amount,
            dueDate: String(editing.dueDate ?? "").slice(0, 10),
          }
        : {
            categoryId: categories[0] ? String(categories[0].id) : "",
            description: "",
            amount: 0,
            dueDate: todayISO(),
          }
    );
  }, [formOpen, editing, categories, reset]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(undefined);
  };

  const saveMutation = useMutation({
    mutationFn: (data: ChargeForm) => {
      const payload = {
        expenseCategoryId: Number(data.categoryId),
        description: data.description.trim(),
        amount: Number(data.amount),
        dueDate: data.dueDate,
      };
      return editing
        ? financeService.updateExpenseCharge(editing.expenseChargeId, payload)
        : financeService.createExpenseCharge(payload);
    },
    onSuccess: () => {
      invalidate();
      toast.success(editing ? "Charge updated" : "Charge added");
      closeForm();
    },
    onError: (err) => toast.error(getErrorMessage(err, "Failed to save charge")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeService.deleteExpenseCharge(id),
    onSuccess: () => {
      invalidate();
      toast.success("Charge deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Failed to delete charge")),
  });

  const totalPending = useMemo(() => charges.reduce((s, c) => s + c.balance, 0), [charges]);

  const columns = useMemo<ColumnDef<ExpenseChargeRecord, any>[]>(
    () => [
      columnHelper.accessor("categoryName", {
        header: "Category",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(info.getValue(), currency)}</span>
        ),
      }),
      columnHelper.accessor("balance", {
        header: "To pay",
        cell: (info) => (
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(info.getValue(), currency)}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge className={STATUS_STYLES[info.getValue()] ?? ""} dot>
            {info.getValue()}
          </Badge>
        ),
      }),
      ...dateTimeColumns<ExpenseChargeRecord>("dueDate", "Due", (c) => c.dueDate, (c) => c.createdAt),
      columnHelper.display({
        id: "pay",
        header: "",
        cell: (info) => (
          <Button size="sm" variant="primary" leftIcon={<Banknote className="h-3.5 w-3.5" />} onClick={() => setPayFor(info.row.original)}>
            Pay
          </Button>
        ),
      }),
    ],
    [currency]
  );

  return (
    <div className="space-y-6">
      <ExpenseTabs />
      <PageHeader
        title="Expense Charges"
        subtitle="Bills and obligations to pay. Pay each one fully or in parts."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
            Add charge
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Open charges"
          value={String(charges.length)}
          loading={isLoading}
          icon={<Receipt className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          label="Total to pay"
          value={formatCurrency(totalPending, currency)}
          loading={isLoading}
          icon={<Receipt className="h-5 w-5" />}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </div>

      <DataTable
        columns={columns}
        data={charges}
        loading={isLoading}
        error={error ? getErrorMessage(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search charges…"
        emptyTitle="No open expense charges"
        emptyDescription="Add a bill to pay, then use Pay to record the payment."
        getRowId={(row) => String(row.expenseChargeId)}
        actions={(row) => [
          { label: "Pay", icon: <Banknote className="h-4 w-4" />, onClick: () => setPayFor(row) },
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              setEditing(row);
              setFormOpen(true);
            },
          },
          {
            label: "Print",
            icon: <Printer className="h-4 w-4" />,
            onClick: () =>
              settings &&
              printCharge(
                {
                  id: row.chargeNumber,
                  categoryName: row.categoryName,
                  description: row.description ?? "",
                  amount: row.balance,
                  dueDate: String(row.dueDate).slice(0, 10),
                },
                settings
              ),
          },
          { divider: true },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            disabled: row.paidAmount > 0,
            onClick: async () => {
              const ok = await confirmDialog({
                title: "Delete expense charge?",
                text: `${row.categoryName} · ${formatCurrency(row.amount, currency)}. Charges with payments can't be deleted.`,
                confirmText: "Delete",
              });
              if (ok) deleteMutation.mutate(row.expenseChargeId);
            },
          },
        ]}
      />

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit expense charge" : "Add expense charge"}
        subtitle={editing ? editing.chargeNumber : "Create a bill before you pay it."}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>
              {editing ? "Save changes" : "Save charge"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
          <Select
            label="Category"
            required
            options={[{ value: "", label: "Select…" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            {...register("categoryId", { required: "Category is required" })}
          />
          <Input
            label="Description"
            required
            placeholder="e.g. Monthly internet bill"
            error={errors.description?.message}
            {...register("description", { required: "Description is required" })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              required
              error={errors.amount?.message}
              hint={editing && editing.paidAmount > 0 ? `Already paid ${formatCurrency(editing.paidAmount, currency)}` : undefined}
              {...register("amount", {
                required: "Amount is required",
                valueAsNumber: true,
                min: { value: Math.max(0.01, editing?.paidAmount ?? 0), message: "Too low" },
              })}
            />
            <Input label="Due date" type="date" required {...register("dueDate", { required: true })} />
          </div>
        </form>
      </Modal>

      <ExpenseFormModal open={!!payFor} onClose={() => setPayFor(undefined)} charge={payFor} />
    </div>
  );
}
