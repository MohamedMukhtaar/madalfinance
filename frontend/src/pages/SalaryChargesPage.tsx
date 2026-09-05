import { useEffect, useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Banknote, Plus, Receipt, Trash2, Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, Button, Modal, MonthNavigator, StatCard, confirmDialog } from "@/components/ui";
import { Input, Select } from "@/components/ui/FormField";
import { HrTabs } from "@/features/hr/HrTabs";
import {
  useAccounts,
  useCreateSalaryCharge,
  useDefaultAccount,
  useDeleteSalaryCharge,
  useEmployees,
  useGenerateSalaryCharges,
  usePaySalaryCharge,
  useSalaryCharges,
} from "@/hooks/queries";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { useSettings } from "@/context/SettingsContext";
import { DUE_STATUS_STYLES, PAYMENT_METHODS } from "@/utils/constants";
import { formatAccountOptionLabel, formatCurrency, todayISO } from "@/utils/format";
import type { SalaryCharge } from "@/types";

const columnHelper = createColumnHelper<SalaryCharge>();

interface ChargeForm {
  employeeId: string;
  basicSalary: number;
  allowance: number;
  deduction: number;
}

interface PayForm {
  amount: number;
  accId: string;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
}

export default function SalaryChargesPage() {
  const { month, setMonth } = useSelectedMonth();
  const { currency } = useSettings();
  const { data, isLoading, error, refetch } = useSalaryCharges({ year: month.year, month: month.month });
  const charges = data?.rows ?? [];
  const { data: employeesData } = useEmployees();
  const employees = (employeesData?.rows ?? []).filter((e) => e.status === "active");
  const { data: accounts = [] } = useAccounts();
  const { data: defaultAccount } = useDefaultAccount();
  const generateMutation = useGenerateSalaryCharges();
  const createMutation = useCreateSalaryCharge();
  const deleteMutation = useDeleteSalaryCharge();
  const payMutation = usePaySalaryCharge();
  const [addOpen, setAddOpen] = useState(false);
  const [payFor, setPayFor] = useState<SalaryCharge | undefined>();

  const totals = useMemo(() => {
    return {
      net: charges.reduce((s, c) => s + Number(c.netSalary), 0),
      paid: charges.reduce((s, c) => s + Number(c.paidAmount), 0),
      due: charges.reduce((s, c) => s + Number(c.balance), 0),
    };
  }, [charges]);

  const columns = useMemo<ColumnDef<SalaryCharge>[]>(
    () => [
      columnHelper.accessor("fullName", {
        header: "Employee",
        cell: (info) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</p>
            <p className="text-xs text-slate-400">{info.row.original.chargeNumber}</p>
          </div>
        ),
      }),
      columnHelper.accessor("netSalary", {
        header: "Net",
        cell: (info) => (
          <span className="font-mono font-semibold">{formatCurrency(info.getValue(), currency)}</span>
        ),
      }),
      columnHelper.accessor("paidAmount", {
        header: "Paid",
        cell: (info) => <span className="font-mono text-emerald-700 dark:text-emerald-300">{formatCurrency(info.getValue(), currency)}</span>,
      }),
      columnHelper.accessor("balance", {
        header: "Balance",
        cell: (info) => <span className="font-mono font-bold">{formatCurrency(info.getValue(), currency)}</span>,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <Badge className={DUE_STATUS_STYLES[info.getValue()] ?? ""}>{info.getValue()}</Badge>,
      }),
      columnHelper.display({ id: "actions", header: "", cell: () => null }),
    ],
    [currency]
  );

  return (
    <div className="space-y-6">
      <HrTabs />
      <PageHeader
        title="Salary charges"
        subtitle="Generate monthly payroll charges, then record payments against them."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthNavigator value={month} onChange={setMonth} />
            <Button
              variant="secondary"
              leftIcon={<Wand2 className="h-4 w-4" />}
              loading={generateMutation.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Generate salary charges?",
                  text: "Creates a charge for each active employee with a basic salary who is not already billed this month.",
                  confirmText: "Generate",
                });
                if (ok) generateMutation.mutate({ year: month.year, month: month.month });
              }}
            >
              Generate month
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              Add charge
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Net payroll" value={formatCurrency(totals.net, currency)} icon={<Receipt className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Paid" value={formatCurrency(totals.paid, currency)} icon={<Banknote className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Outstanding" value={formatCurrency(totals.due, currency)} icon={<Receipt className="h-5 w-5" />} loading={isLoading} />
      </div>

      <DataTable
        columns={columns}
        data={charges}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search charges…"
        emptyTitle="No salary charges this month"
        emptyDescription="Generate charges for all active employees, or add one."
        getRowId={(row) => String(row.salaryChargeId)}
        actions={(row) => {
          const items = [];
          if (row.status !== "Paid" && row.status !== "Cancelled" && Number(row.balance) > 0) {
            items.push({
              label: "Pay",
              icon: <Banknote className="h-4 w-4" />,
              onClick: () => setPayFor(row),
            });
          }
          if (Number(row.paidAmount) === 0) {
            items.push({
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: async () => {
                const ok = await confirmDialog({
                  title: `Delete ${row.chargeNumber}?`,
                  text: `This unpaid charge for ${row.fullName} will be removed.`,
                  confirmText: "Delete",
                });
                if (ok) deleteMutation.mutate(row.salaryChargeId);
              },
            });
          }
          return items;
        }}
      />

      <AddChargeModal
        open={addOpen}
        employees={employees}
        year={month.year}
        month={month.month}
        onClose={() => setAddOpen(false)}
        loading={createMutation.isPending}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
          setAddOpen(false);
        }}
      />

      <PaySalaryModal
        charge={payFor}
        accounts={accounts}
        defaultAccId={defaultAccount?.accId}
        currency={currency}
        loading={payMutation.isPending}
        onClose={() => setPayFor(undefined)}
        onSubmit={async (data) => {
          if (!payFor) return;
          await payMutation.mutateAsync({ id: payFor.salaryChargeId, data });
          setPayFor(undefined);
        }}
      />
    </div>
  );
}

function AddChargeModal({
  open,
  employees,
  year,
  month,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  employees: Array<{ employeeId: number; fullName: string; basicSalary: number }>;
  year: number;
  month: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: { employeeId: number; year: number; month: number; basicSalary: number; allowance: number; deduction: number }) => Promise<void>;
}) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<ChargeForm>();
  const employeeId = watch("employeeId");

  useEffect(() => {
    if (!open) return;
    const first = employees[0];
    reset({
      employeeId: first ? String(first.employeeId) : "",
      basicSalary: first ? Number(first.basicSalary) : 0,
      allowance: 0,
      deduction: 0,
    });
  }, [open, employees, reset]);

  useEffect(() => {
    const emp = employees.find((e) => String(e.employeeId) === employeeId);
    if (emp) setValue("basicSalary", Number(emp.basicSalary));
  }, [employeeId, employees, setValue]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add salary charge"
      subtitle={`Period: ${String(month).padStart(2, "0")}/${year}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit(async (d) => {
              await onSubmit({
                employeeId: Number(d.employeeId),
                year,
                month,
                basicSalary: Number(d.basicSalary),
                allowance: Number(d.allowance) || 0,
                deduction: Number(d.deduction) || 0,
              });
            })}
          >
            Create charge
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Employee"
            required
            options={employees.map((e) => ({ value: String(e.employeeId), label: e.fullName }))}
            {...register("employeeId", { required: true })}
          />
        </div>
        <Input label="Basic salary" type="number" step="0.01" min={0} {...register("basicSalary", { valueAsNumber: true })} />
        <Input label="Allowance" type="number" step="0.01" min={0} {...register("allowance", { valueAsNumber: true })} />
        <Input label="Deduction" type="number" step="0.01" min={0} {...register("deduction", { valueAsNumber: true })} />
      </form>
    </Modal>
  );
}

function PaySalaryModal({
  charge,
  accounts,
  defaultAccId,
  currency,
  loading,
  onClose,
  onSubmit,
}: {
  charge?: SalaryCharge;
  accounts: Array<{ accId: number; institution: string; number: string; balance?: number; isDefault?: boolean }>;
  defaultAccId?: number;
  currency: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; accId?: number; paymentMethod: string; paymentDate: string; referenceNumber?: string }) => Promise<void>;
}) {
  const { register, handleSubmit, reset } = useForm<PayForm>();

  useEffect(() => {
    if (!charge) return;
    reset({
      amount: Number(charge.balance),
      accId: defaultAccId ? String(defaultAccId) : accounts[0] ? String(accounts[0].accId) : "",
      paymentMethod: "Cash",
      paymentDate: todayISO(),
      referenceNumber: "",
    });
  }, [charge, defaultAccId, accounts, reset]);

  return (
    <Modal
      open={!!charge}
      onClose={onClose}
      title="Pay salary"
      subtitle={charge ? `${charge.fullName} · ${formatCurrency(Number(charge.balance), currency)} due` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit(async (d) => {
              await onSubmit({
                amount: Number(d.amount),
                accId: d.accId ? Number(d.accId) : undefined,
                paymentMethod: d.paymentMethod,
                paymentDate: d.paymentDate,
                referenceNumber: d.referenceNumber.trim() || undefined,
              });
            })}
          >
            Record payment
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <Input label="Amount" type="number" step="0.01" min={0.01} required {...register("amount", { valueAsNumber: true, min: 0.01 })} />
        <Input label="Date" type="date" required {...register("paymentDate", { required: true })} />
        <Select
          label="Account"
          required
          options={accounts.map((a) => ({
            value: String(a.accId),
            label: formatAccountOptionLabel(a, currency),
          }))}
          {...register("accId", { required: true })}
        />
        <Select label="Method" options={[...PAYMENT_METHODS]} {...register("paymentMethod")} />
        <div className="sm:col-span-2">
          <Input label="Reference" {...register("referenceNumber")} />
        </div>
      </form>
    </Modal>
  );
}
