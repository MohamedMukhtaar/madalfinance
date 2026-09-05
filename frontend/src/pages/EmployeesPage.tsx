import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Briefcase, FileDown, FileSpreadsheet, Filter, Pencil, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, Button, Card, Modal, StatCard, Tabs, confirmDialog } from "@/components/ui";
import { Input, Select, Textarea, fieldBase } from "@/components/ui/FormField";
import {
  useCreateEmployee,
  useCreateEmployeeOrg,
  useDeleteEmployee,
  useDeleteEmployeeOrg,
  useEmployeeOrg,
  useEmployees,
  useUpdateEmployee,
  useUpdateEmployeeOrg,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { CUSTOMER_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, todayISO } from "@/utils/format";
import { financeService } from "@/services/finance";
import { api, getErrorMessage } from "@/services/api";
import { cn } from "@/utils/cn";
import type { Employee, EmployeeOrgKind, EmployeeOrgRecord } from "@/types";

const columnHelper = createColumnHelper<Employee>();
const orgHelper = createColumnHelper<EmployeeOrgRecord>();

const ORG_TABS: { value: EmployeeOrgKind; label: string; singular: string }[] = [
  { value: "departments", label: "Departments", singular: "department" },
  { value: "titles", label: "Titles", singular: "title" },
  { value: "branches", label: "Branches", singular: "branch" },
  { value: "shifts", label: "Shifts", singular: "shift" },
];

const EMPTY_FILTERS = {
  departmentId: "",
  jobTitleId: "",
  branchId: "",
  status: "",
  gender: "",
};

type EmployeeFilters = typeof EMPTY_FILTERS;

interface EmployeeForm {
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  email: string;
  jobTitleId: string;
  departmentId: string;
  branchId: string;
  shiftId: string;
  hireDate: string;
  basicSalary: number;
  status: "active" | "inactive";
  notes: string;
}

type CreatePayload = Parameters<typeof financeService.createEmployee>[0];
type UpdatePayload = Parameters<typeof financeService.updateEmployee>[1];

function orgId(row: EmployeeOrgRecord, kind: EmployeeOrgKind): number {
  if (kind === "departments") return Number(row.departmentId);
  if (kind === "titles") return Number(row.jobTitleId);
  if (kind === "branches") return Number(row.branchId);
  return Number(row.shiftId);
}

function orgName(row: EmployeeOrgRecord, kind: EmployeeOrgKind): string {
  if (kind === "departments") return row.departmentName ?? "";
  if (kind === "titles") return row.titleName ?? "";
  if (kind === "branches") return row.branchName ?? "";
  return row.shiftName ?? "";
}

function clock(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 5);
}

const filterSelect = cn(fieldBase, "h-10 min-w-[12rem] flex-1 appearance-none pr-9");

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; idle: string; active: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-9 rounded-xl px-3.5 text-sm font-semibold transition",
              selected ? opt.active : opt.idle
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const STATUS_CHIPS = [
  { value: "", label: "All", idle: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300", active: "bg-rose-500 text-white shadow-sm" },
  { value: "active", label: "Active", idle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300", active: "bg-emerald-500 text-white shadow-sm" },
  { value: "inactive", label: "Inactive", idle: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300", active: "bg-rose-600 text-white shadow-sm" },
];

const GENDER_CHIPS = [
  { value: "", label: "All", idle: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300", active: "bg-rose-500 text-white shadow-sm" },
  { value: "Male", label: "Male", idle: "bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300", active: "bg-sky-500 text-white shadow-sm" },
  { value: "Female", label: "Female", idle: "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300", active: "bg-orange-500 text-white shadow-sm" },
];

export default function EmployeesPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const view: "staff" | EmployeeOrgKind = ORG_TABS.some((t) => t.value === tab) ? (tab as EmployeeOrgKind) : "staff";

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { label: "Employees", value: "staff" },
          ...ORG_TABS.map((t) => ({ label: t.label, value: t.value })),
        ]}
        active={view}
        onChange={(value) => navigate(value === "staff" ? "/employees" : `/employees/${value}`)}
      />
      {view === "staff" ? <StaffPanel /> : <OrgPanel kind={view} />}
    </div>
  );
}

function StaffPanel() {
  const { data, isLoading, error, refetch } = useEmployees({ perPage: 100 });
  const employees = data?.rows ?? [];
  const { data: departments = [] } = useEmployeeOrg("departments");
  const { data: titles = [] } = useEmployeeOrg("titles");
  const { data: branches = [] } = useEmployeeOrg("branches");
  const { data: shifts = [] } = useEmployeeOrg("shifts");
  const { currency } = useSettings();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>();
  const [filters, setFilters] = useState<EmployeeFilters>(EMPTY_FILTERS);

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (filters.departmentId && String(e.departmentId ?? "") !== filters.departmentId) return false;
        if (filters.jobTitleId && String(e.jobTitleId ?? "") !== filters.jobTitleId) return false;
        if (filters.branchId && String(e.branchId ?? "") !== filters.branchId) return false;
        if (filters.status && e.status !== filters.status) return false;
        if (filters.gender && (e.gender ?? "") !== filters.gender) return false;
        return true;
      }),
    [employees, filters]
  );

  const exportList = async (format: "pdf" | "xlsx") => {
    try {
      const url = await financeService.exportReportUrl("employeeList", format);
      const response = await api.get(url.replace(/^\/api/, ""), {
        responseType: "blob",
        timeout: 60000,
      });
      const contentType = String(response.headers["content-type"] ?? "");
      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Export failed");
      }
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `employees-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} downloaded`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to export employees"));
    }
  };

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      columnHelper.accessor("employeeCode", {
        header: "ID",
        cell: (info) => <span className="font-mono text-xs text-slate-500">{info.getValue()}</span>,
      }),
      columnHelper.accessor("fullName", {
        header: "Name",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <span className="text-sm text-slate-500">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("gender", {
        header: "Gender",
        cell: (info) => <span className="text-slate-500">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("department", {
        header: "Dept",
        cell: (info) => <span className="text-slate-600 dark:text-slate-300">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("jobTitle", {
        header: "Title",
        cell: (info) => <span className="text-slate-600 dark:text-slate-300">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("branch", {
        header: "Branch",
        cell: (info) => <span className="text-slate-500">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("shift", {
        header: "Shift",
        cell: (info) => <span className="text-slate-500">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("basicSalary", {
        header: "Salary",
        cell: (info) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge className={CUSTOMER_STATUS_STYLES[info.getValue()] ?? ""} dot>
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("hireDate", {
        header: "Hire date",
        cell: (info) => <span className="text-sm text-slate-500">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({ id: "actions", header: "", cell: () => null }),
    ],
    [currency]
  );

  const activeCount = filtered.filter((e) => e.status === "active").length;
  const payroll = filtered.filter((e) => e.status === "active").reduce((s, e) => s + Number(e.basicSalary), 0);

  const lookupOptions = (rows: EmployeeOrgRecord[], kind: EmployeeOrgKind, allLabel: string) => [
    { value: "", label: allLabel },
    ...rows.map((row) => ({ value: String(orgId(row, kind)), label: orgName(row, kind) })),
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Staff register used for salary charges and payments."
        actions={
          <>
            <Button variant="secondary" onClick={() => void exportList("pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
              PDF
            </Button>
            <Button variant="secondary" onClick={() => void exportList("xlsx")} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              Excel
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(undefined);
                setModalOpen(true);
              }}
            >
              Add employee
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Employees" value={String(filtered.length)} icon={<Users className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Active" value={String(activeCount)} icon={<Briefcase className="h-5 w-5" />} loading={isLoading} />
        <StatCard
          label="Monthly payroll"
          value={formatCurrency(payroll, currency)}
          icon={<Briefcase className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-ink">
            <Filter className="h-4 w-4 text-ink-soft" />
            <h2 className="text-sm font-bold">Filters</h2>
          </div>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[12rem] flex-1">
            <select
              className={filterSelect}
              value={filters.departmentId}
              aria-label="Department"
              onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
            >
              {lookupOptions(departments, "departments", "All Departments").map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[12rem] flex-1">
            <select
              className={filterSelect}
              value={filters.branchId}
              aria-label="Branch"
              onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
            >
              {lookupOptions(branches, "branches", "All Branches").map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[12rem] flex-1">
            <select
              className={filterSelect}
              value={filters.jobTitleId}
              aria-label="Title"
              onChange={(e) => setFilters((f) => ({ ...f, jobTitleId: e.target.value }))}
            >
              {lookupOptions(titles, "titles", "All Titles").map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <ChipGroup
            options={STATUS_CHIPS}
            value={filters.status}
            onChange={(status) => setFilters((f) => ({ ...f, status }))}
          />
          <ChipGroup
            options={GENDER_CHIPS}
            value={filters.gender}
            onChange={(gender) => setFilters((f) => ({ ...f, gender }))}
          />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search employees…"
        emptyTitle="No employees yet"
        emptyDescription="Add staff so you can generate salary charges."
        getRowId={(row) => String(row.employeeId)}
        actions={(row) => [
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              setEditing(row);
              setModalOpen(true);
            },
          },
          {
            label: "Remove",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: async () => {
              const ok = await confirmDialog({
                title: `Remove ${row.fullName}?`,
                text: "If this employee has salary history they will be deactivated instead of deleted.",
                confirmText: "Remove",
              });
              if (ok) deleteMutation.mutate(row.employeeId);
            },
          },
        ]}
      />

      <EmployeeFormModal
        open={modalOpen}
        employee={editing}
        departments={departments}
        titles={titles}
        branches={branches}
        shifts={shifts}
        onClose={() => setModalOpen(false)}
        onCreate={async (data) => {
          await createMutation.mutateAsync(data);
          setModalOpen(false);
        }}
        onUpdate={async (id, patch) => {
          await updateMutation.mutateAsync({ id, patch });
          setModalOpen(false);
        }}
      />
    </>
  );
}

function OrgPanel({ kind }: { kind: EmployeeOrgKind }) {
  const meta = ORG_TABS.find((t) => t.value === kind)!;
  const { data = [], isLoading, error, refetch } = useEmployeeOrg(kind);
  const createMutation = useCreateEmployeeOrg(kind);
  const updateMutation = useUpdateEmployeeOrg(kind);
  const deleteMutation = useDeleteEmployeeOrg(kind);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeOrgRecord | undefined>();

  const columns = useMemo<ColumnDef<EmployeeOrgRecord>[]>(() => {
    const cols: ColumnDef<EmployeeOrgRecord>[] = [
      orgHelper.display({
        id: "name",
        header: meta.singular.charAt(0).toUpperCase() + meta.singular.slice(1),
        cell: ({ row }) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">{orgName(row.original, kind)}</span>
        ),
      }),
    ];
    if (kind === "shifts") {
      cols.push(
        orgHelper.accessor("startTime", {
          header: "Starts",
          cell: (info) => <span className="font-mono text-sm text-slate-500">{clock(info.getValue()) || "—"}</span>,
        }),
        orgHelper.accessor("endTime", {
          header: "Ends",
          cell: (info) => <span className="font-mono text-sm text-slate-500">{clock(info.getValue()) || "—"}</span>,
        })
      );
    }
    cols.push(
      orgHelper.accessor("employeeCount", {
        header: "Staff",
        cell: (info) => <span className="text-slate-500">{info.getValue() ?? 0}</span>,
      }),
      orgHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge className={CUSTOMER_STATUS_STYLES[info.getValue()] ?? ""} dot>
            {info.getValue()}
          </Badge>
        ),
      }),
      orgHelper.display({ id: "actions", header: "", cell: () => null })
    );
    return cols;
  }, [kind, meta.label]);

  return (
    <>
      <PageHeader
        title={meta.label}
        subtitle={`Manage ${meta.label.toLowerCase()} used on employee records.`}
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            Add {meta.singular}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder={`Search ${meta.label.toLowerCase()}…`}
        emptyTitle={`No ${meta.label.toLowerCase()} yet`}
        emptyDescription={`Create a ${meta.singular} so you can assign it to staff.`}
        getRowId={(row) => String(orgId(row, kind))}
        actions={(row) => [
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              setEditing(row);
              setOpen(true);
            },
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: async () => {
              const ok = await confirmDialog({
                title: `Delete ${orgName(row, kind)}?`,
                text: "This is only allowed if no employees are assigned.",
                confirmText: "Delete",
              });
              if (ok) deleteMutation.mutate(orgId(row, kind));
            },
          },
        ]}
      />

      <OrgFormModal
        open={open}
        kind={kind}
        singular={meta.singular}
        record={editing}
        onClose={() => setOpen(false)}
        onCreate={async (payload) => {
          await createMutation.mutateAsync(payload);
          setOpen(false);
        }}
        onUpdate={async (id, payload) => {
          await updateMutation.mutateAsync({ id, patch: payload });
          setOpen(false);
        }}
      />
    </>
  );
}

function EmployeeFormModal({
  open,
  employee,
  departments,
  titles,
  branches,
  shifts,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  employee?: Employee;
  departments: EmployeeOrgRecord[];
  titles: EmployeeOrgRecord[];
  branches: EmployeeOrgRecord[];
  shifts: EmployeeOrgRecord[];
  onClose: () => void;
  onCreate: (data: CreatePayload) => Promise<void>;
  onUpdate: (id: number, patch: UpdatePayload) => Promise<void>;
}) {
  const isEdit = !!employee;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>();

  useEffect(() => {
    if (!open) return;
    reset(
      employee
        ? {
            firstName: employee.firstName,
            lastName: employee.lastName ?? "",
            gender: employee.gender ?? "",
            phone: employee.phone ?? "",
            email: employee.email ?? "",
            jobTitleId: employee.jobTitleId ? String(employee.jobTitleId) : "",
            departmentId: employee.departmentId ? String(employee.departmentId) : "",
            branchId: employee.branchId ? String(employee.branchId) : "",
            shiftId: employee.shiftId ? String(employee.shiftId) : "",
            hireDate: String(employee.hireDate).slice(0, 10),
            basicSalary: Number(employee.basicSalary),
            status: employee.status,
            notes: employee.notes ?? "",
          }
        : {
            firstName: "",
            lastName: "",
            gender: "",
            phone: "",
            email: "",
            jobTitleId: "",
            departmentId: "",
            branchId: "",
            shiftId: "",
            hireDate: todayISO(),
            basicSalary: 0,
            status: "active",
            notes: "",
          }
    );
  }, [open, employee, reset]);

  const options = (rows: EmployeeOrgRecord[], kind: EmployeeOrgKind, placeholder: string) => {
    const current =
      kind === "departments"
        ? employee?.departmentId
        : kind === "titles"
          ? employee?.jobTitleId
          : kind === "branches"
            ? employee?.branchId
            : employee?.shiftId;
    const visible = rows.filter((row) => row.status !== "inactive" || orgId(row, kind) === Number(current));
    return [{ value: "", label: placeholder }, ...visible.map((row) => ({ value: String(orgId(row, kind)), label: orgName(row, kind) }))];
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit employee" : "Add employee"}
      subtitle={isEdit ? "Update staff details and basic salary." : "Register a staff member for payroll."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            onClick={handleSubmit(async (d) => {
              const payload: CreatePayload = {
                firstName: d.firstName.trim(),
                lastName: d.lastName.trim() || undefined,
                gender: d.gender || undefined,
                phone: d.phone.trim() || undefined,
                email: d.email.trim() || undefined,
                jobTitleId: d.jobTitleId ? Number(d.jobTitleId) : null,
                departmentId: d.departmentId ? Number(d.departmentId) : null,
                branchId: d.branchId ? Number(d.branchId) : null,
                shiftId: d.shiftId ? Number(d.shiftId) : null,
                hireDate: d.hireDate,
                basicSalary: Number(d.basicSalary),
                notes: d.notes.trim() || undefined,
              };
              if (isEdit && employee) {
                await onUpdate(employee.employeeId, { ...payload, status: d.status });
              } else {
                await onCreate(payload);
              }
            })}
          >
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" required error={errors.firstName?.message} {...register("firstName", { required: "Required" })} />
        <Input label="Last name" {...register("lastName")} />
        <Select
          label="Gender"
          options={[
            { value: "", label: "—" },
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
          ]}
          {...register("gender")}
        />
        <Input label="Phone" {...register("phone")} />
        <Input label="Email" type="email" {...register("email")} />
        <Select label="Department" options={options(departments, "departments", "Select department")} {...register("departmentId")} />
        <Select label="Title" options={options(titles, "titles", "Select title")} {...register("jobTitleId")} />
        <Select label="Branch" options={options(branches, "branches", "Select branch")} {...register("branchId")} />
        <Select label="Shift" options={options(shifts, "shifts", "Select shift")} {...register("shiftId")} />
        <Input label="Hire date" type="date" required {...register("hireDate", { required: "Required" })} />
        <Input
          label="Basic salary"
          type="number"
          step="0.01"
          min={0}
          required
          {...register("basicSalary", { valueAsNumber: true, required: true, min: 0 })}
        />
        {isEdit && (
          <Select
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            {...register("status")}
          />
        )}
        <div className="sm:col-span-2">
          <Textarea label="Notes" rows={3} {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}

function OrgFormModal({
  open,
  kind,
  singular,
  record,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  kind: EmployeeOrgKind;
  singular: string;
  record?: EmployeeOrgRecord;
  onClose: () => void;
  onCreate: (data: { name: string; notes?: string; startTime?: string; endTime?: string }) => Promise<void>;
  onUpdate: (
    id: number,
    data: Partial<{ name: string; notes: string; status: string; startTime: string; endTime: string }>
  ) => Promise<void>;
}) {
  const isEdit = !!record;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; notes: string; status: "active" | "inactive"; startTime: string; endTime: string }>();

  useEffect(() => {
    if (!open) return;
    reset(
      record
        ? {
            name: orgName(record, kind),
            notes: record.notes ?? "",
            status: record.status,
            startTime: clock(record.startTime),
            endTime: clock(record.endTime),
          }
        : { name: "", notes: "", status: "active", startTime: "", endTime: "" }
    );
  }, [open, record, kind, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${singular}` : `Add ${singular}`}
      subtitle={`This ${singular} can be assigned to employees.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            onClick={handleSubmit(async (d) => {
              const payload = {
                name: d.name.trim(),
                notes: d.notes.trim() || undefined,
                startTime: kind === "shifts" ? d.startTime || undefined : undefined,
                endTime: kind === "shifts" ? d.endTime || undefined : undefined,
              };
              if (isEdit && record) {
                await onUpdate(orgId(record, kind), { ...payload, status: d.status });
              } else {
                await onCreate(payload);
              }
            })}
          >
            {isEdit ? "Save changes" : "Create"}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Name"
            required
            error={errors.name?.message}
            {...register("name", { required: "Required", minLength: { value: 2, message: "Too short" } })}
          />
        </div>
        {kind === "shifts" && (
          <>
            <Input label="Start time" type="time" {...register("startTime")} />
            <Input label="End time" type="time" {...register("endTime")} />
          </>
        )}
        {isEdit && (
          <Select
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            {...register("status")}
          />
        )}
        <div className="sm:col-span-2">
          <Textarea label="Notes" rows={3} {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}
