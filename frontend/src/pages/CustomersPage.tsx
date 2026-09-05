import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Download, Eye, Pencil, Plus, Trash2, Users, CircleCheck, ReceiptText } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, Avatar, DateRangeFilter, type DateFilterMode, Select, StatCard, StatCardsGrid, promptDeleteReason } from "@/components/ui";
import { CustomerFormModal } from "@/features/customers/CustomerFormModal";
import { useCustomers, useDeleteCustomer, usePayments } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { CUSTOMER_STATUS_STYLES } from "@/utils/constants";
import { downloadCSV, formatCurrency, formatDate, formatTime } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import type { Customer } from "@/types";
import { cn } from "@/utils/cn";

const columnHelper = createColumnHelper<Customer>();

export default function CustomersPage() {
  const { data, isLoading, error, refetch } = useCustomers();
  const { data: paymentsData } = usePayments();
  const customers = data?.rows ?? [];
  const payments = paymentsData?.rows ?? [];
  const deleteMutation = useDeleteCustomer();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const monthStats = useMemo(() => {
    const dateOpts = { mode: dateMode, date: day, from, to };
    const inPeriod = customers.filter((c) => matchesDateFilter(c.createdAt, dateOpts));
    const periodPayments = payments.filter((p) => matchesDateFilter(p.paymentDate, dateOpts));
    return {
      newCount: inPeriod.length,
      active: customers.filter((c) => c.status === "active").length,
      collected: periodPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0),
      outstanding: customers.reduce((s, c) => s + c.outstandingBalance, 0),
    };
  }, [customers, payments, dateMode, day, from, to]);

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          (statusFilter === "all" || c.status === statusFilter) &&
          matchesDateFilter(c.createdAt, { mode: dateMode, date: day, from, to })
      ),
    [customers, statusFilter, dateMode, day, from, to]
  );

  const columns = useMemo<ColumnDef<Customer, any>[]>(
    () => [
      columnHelper.accessor("customerCode", {
        header: "Code",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("customerName", {
        header: "Customer",
        sortingFn: "alphanumeric",
        cell: (info) => {
          const c = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar name={c.customerName} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{c.customerName}</p>
                {c.companyName && <p className="truncate text-xs text-slate-400">{c.companyName}</p>}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="max-w-[11rem] truncate text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("projectCount", {
        header: "Projects",
        cell: (info) => (
          <Badge className="bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30">
            {info.getValue()} project{info.getValue() === 1 ? "" : "s"}
          </Badge>
        ),
      }),
      columnHelper.accessor("outstandingBalance", {
        header: "Outstanding",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={cn(
                "font-mono font-semibold",
                v > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatCurrency(v, currency)}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge className={CUSTOMER_STATUS_STYLES[info.getValue()]} dot>
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Date",
        cell: (info) => (
          <span className="text-xs text-slate-400">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: "time",
        header: "Time",
        cell: (info) => <span className="text-xs text-slate-400">{formatTime(info.row.original.createdAt)}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: () => null,
      }),
    ],
    [currency]
  );

  const exportCSV = () => {
    downloadCSV(
      customers.map((c) => ({
        Code: c.customerCode,
        Name: c.customerName,
        Company: c.companyName ?? "",
        Phone: c.phone,
        Email: c.email,
        City: c.city ?? "",
        Projects: c.projectCount,
        Outstanding: c.outstandingBalance,
        Status: c.status,
        Created: c.createdAt,
      })),
      "customers.csv"
    );
  };

  const handleDelete = async (c: Customer) => {
    const reason = await promptDeleteReason({
      title: `Delete ${c.customerName}?`,
      text: "This customer will be moved to Trash and can be restored later.",
      confirmText: "Move to trash",
    });
    if (reason) deleteMutation.mutate({ id: c.customerId, reason });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage your client base, balances and records."
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV} leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setModalOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Customer
            </Button>
          </>
        }
      />

      <StatCardsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} loading={isLoading} label="Customers" value={String(monthStats.newCount)} icon={<Users className="h-4 w-4" />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" />
        <StatCard index={1} loading={isLoading} label="Active" value={String(monthStats.active)} icon={<CircleCheck className="h-4 w-4" />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <StatCard index={2} loading={isLoading} label="Collected" value={formatCurrency(monthStats.collected, currency)} icon={<ReceiptText className="h-4 w-4" />} iconClassName="bg-secondary-50 text-primary dark:bg-secondary-500/10 dark:text-secondary-300" />
        <StatCard index={3} loading={isLoading} label="Outstanding" value={formatCurrency(monthStats.outstanding, currency)} icon={<ReceiptText className="h-4 w-4" />} iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
      </StatCardsGrid>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Search customers…"
        onRowClick={(row) => navigate(`/customers/${row.customerId}`)}
        actions={(row) => [
          { label: "View Profile", icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/customers/${row.customerId}`) },
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              setEditing(row);
              setModalOpen(true);
            },
          },
          { divider: true },
          { label: "Delete", icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => handleDelete(row) },
        ]}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              className="w-40"
            />
            <DateRangeFilter
              mode={dateMode}
              onModeChange={setDateMode}
              date={day}
              from={from}
              to={to}
              onDateChange={setDay}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </div>
        }
      />

      <CustomerFormModal open={modalOpen} onClose={() => setModalOpen(false)} customer={editing} />
    </div>
  );
}
