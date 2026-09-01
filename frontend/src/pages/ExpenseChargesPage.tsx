import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Banknote, Plus, Printer, Receipt, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal, StatCard, promptDeleteReason } from "@/components/ui";
import { Input, Select } from "@/components/ui/FormField";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import { useExpenseCategories } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatDate, todayISO } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import {
  addExpenseCharge,
  loadExpenseCharges,
  removeExpenseCharge,
  type ExpenseCharge,
} from "@/utils/expenseCharges";
import { printCharge } from "@/utils/print";

const columnHelper = createColumnHelper<ExpenseCharge>();

interface ChargeForm {
  categoryId: string;
  description: string;
  amount: number;
  dueDate: string;
}

export default function ExpenseChargesPage() {
  const { currency, settings } = useSettings();
  const { data: categories = [] } = useExpenseCategories();
  const [charges, setCharges] = useState<ExpenseCharge[]>(() => loadExpenseCharges());
  const [addOpen, setAddOpen] = useState(false);
  const [payFor, setPayFor] = useState<ExpenseCharge | undefined>();

  const refresh = () => setCharges(loadExpenseCharges());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChargeForm>();

  useEffect(() => {
    if (addOpen) {
      reset({
        categoryId: categories[0] ? String(categories[0].id) : "",
        description: "",
        amount: 0,
        dueDate: todayISO(),
      });
    }
  }, [addOpen, categories, reset]);

  const totalPending = useMemo(() => charges.reduce((s, c) => s + c.amount, 0), [charges]);

  const columns = useMemo<ColumnDef<ExpenseCharge, any>[]>(
    () => [
      columnHelper.accessor("categoryName", {
        header: "Category",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      ...dateTimeColumns<ExpenseCharge>("dueDate", "Due", (c) => c.dueDate, (c) => c.createdAt),
      columnHelper.display({
        id: "pay",
        header: "",
        cell: (info) => (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Banknote className="h-3.5 w-3.5" />}
            onClick={() => setPayFor(info.row.original)}
          >
            Pay
          </Button>
        ),
      }),
    ],
    [currency]
  );

  const onAddCharge = (data: ChargeForm) => {
    const category = categories.find((c) => String(c.id) === data.categoryId);
    if (!category) return;
    addExpenseCharge({
      categoryId: category.id,
      categoryName: category.name,
      description: data.description,
      amount: Number(data.amount),
      dueDate: data.dueDate,
    });
    refresh();
    setAddOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Charges"
        subtitle="Bills and obligations to pay. Record the actual payment from each line."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add charge
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Pending charges"
          value={String(charges.length)}
          icon={<Receipt className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          label="Total to pay"
          value={formatCurrency(totalPending, currency)}
          icon={<Receipt className="h-5 w-5" />}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </div>

      <DataTable
        columns={columns}
        data={charges}
        searchPlaceholder="Search charges…"
        emptyTitle="No expense charges"
        emptyDescription="Add a bill to pay, then use Pay to record the expense."
        actions={(row) => [
          {
            label: "Pay",
            icon: <Banknote className="h-4 w-4" />,
            onClick: () => setPayFor(row),
          },
          {
            label: "Print",
            icon: <Printer className="h-4 w-4" />,
            onClick: () => settings && printCharge(row, settings),
          },
          { divider: true },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: async () => {
              const reason = await promptDeleteReason({
                title: "Delete expense charge?",
                text: "This charge will be removed. You must provide a reason.",
              });
              if (reason) {
                removeExpenseCharge(row.id);
                refresh();
              }
            },
          },
        ]}
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add expense charge"
        subtitle="Create a bill before you pay it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onAddCharge)}>Save charge</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onAddCharge)}>
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
              {...register("amount", { required: "Amount is required", min: { value: 0.01, message: "Invalid" } })}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Due date</label>
              <input
                type="date"
                className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                {...register("dueDate", { required: true })}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ExpenseFormModal
        open={!!payFor}
        onClose={() => setPayFor(undefined)}
        defaults={
          payFor
            ? {
                categoryId: payFor.categoryId,
                description: payFor.description,
                amount: payFor.amount,
                date: todayISO(),
              }
            : undefined
        }
        onSuccess={() => {
          if (payFor) removeExpenseCharge(payFor.id);
          refresh();
          setPayFor(undefined);
        }}
      />
    </div>
  );
}
