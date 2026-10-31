import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  CircleDot,
  ClipboardList,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Badge,
  Button,
  DateRangeFilter,
  FilterBar,
  Modal,
  StatCard,
  StatCardsGrid,
  confirmDialog,
  type DateFilterMode,
} from "@/components/ui";
import { Input, MultiSelect, Select, Textarea } from "@/components/ui/FormField";
import {
  useCreateTask,
  useDeleteTask,
  useEmployees,
  useMembers,
  useTaskStats,
  useTasks,
  useUpdateTask,
} from "@/hooks/queries";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, todayISO } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { PerformanceTask, TaskAssigneeType, TaskPriority, TaskStatus } from "@/types";

const columnHelper = createColumnHelper<PerformanceTask>();

const STATUS_STYLES: Record<TaskStatus, string> = {
  Todo: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-200",
  "In Progress": "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300",
  Done: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: "bg-muted text-ink-muted ring-line",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300",
  High: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300",
};

interface TaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assigneeType: TaskAssigneeType;
  assigneeIds: string[];
}

function isOverdue(task: PerformanceTask) {
  if (!task.dueDate || task.status === "Done" || task.status === "Cancelled") return false;
  return task.dueDate < todayISO();
}

export default function TasksPage() {
  const { hasPermission, hasAnyPermission } = usePermission();
  const canManage = hasAnyPermission(["create tasks", "edit tasks", "delete tasks"]);
  const canCreate = hasPermission("create tasks");
  const canEdit = hasPermission("edit tasks");
  const canDelete = hasPermission("delete tasks");

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [dayFilter, setDayFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceTask | undefined>();

  const listParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      assigneeType: assigneeFilter || undefined,
      employeeId: assigneeFilter === "employee" && employeeFilter ? employeeFilter : undefined,
      memberId: assigneeFilter === "member" && memberFilter ? memberFilter : undefined,
      perPage: 200,
    };
    if (dateMode === "day" && dayFilter) {
      params.fromDate = dayFilter;
      params.toDate = dayFilter;
    } else if (dateMode === "range") {
      if (fromFilter) params.fromDate = fromFilter;
      if (toFilter) params.toDate = toFilter;
    }
    return params;
  }, [
    statusFilter,
    priorityFilter,
    assigneeFilter,
    employeeFilter,
    memberFilter,
    dateMode,
    dayFilter,
    fromFilter,
    toFilter,
  ]);

  const needPeople = formOpen || assigneeFilter === "employee" || assigneeFilter === "member";
  const { data, isLoading, error, refetch } = useTasks(listParams);
  const { data: stats } = useTaskStats();
  const { data: employeesPage } = useEmployees({
    status: "active",
    perPage: 200,
    enabled: needPeople,
  });
  const { data: membersList = [] } = useMembers({ enabled: needPeople });

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const tasks = data?.rows ?? [];
  const employees = (employeesPage?.rows ?? []).filter((e) => e.status === "active");
  const members = membersList.filter((m) => m.status === "active");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
      status: "Todo",
      dueDate: "",
      assigneeType: "employee",
      assigneeIds: [],
    },
  });

  const assigneeType = watch("assigneeType");

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      const id =
        editing.assigneeType === "employee"
          ? editing.employeeId
            ? String(editing.employeeId)
            : ""
          : editing.memberId
            ? String(editing.memberId)
            : "";
      reset({
        title: editing.title,
        description: editing.description ?? "",
        priority: editing.priority,
        status: editing.status,
        dueDate: editing.dueDate ? String(editing.dueDate).slice(0, 10) : "",
        assigneeType: editing.assigneeType,
        assigneeIds: id ? [id] : [],
      });
    } else {
      reset({
        title: "",
        description: "",
        priority: "Medium",
        status: "Todo",
        dueDate: "",
        assigneeType: "employee",
        assigneeIds: [],
      });
    }
  }, [formOpen, editing, reset]);

  const openCreate = () => {
    setEditing(undefined);
    // Defer so the click that opened the dialog doesn't instantly close it.
    window.setTimeout(() => setFormOpen(true), 0);
  };

  const openEdit = (task: PerformanceTask) => {
    setEditing(task);
    window.setTimeout(() => setFormOpen(true), 0);
  };

  const onSave = handleSubmit(async (values) => {
    const ids = values.assigneeIds.map(Number).filter((n) => n > 0);
    const base = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate || null,
      assigneeType: values.assigneeType,
    };
    if (editing) {
      const only = ids[0];
      await updateMutation.mutateAsync({
        id: editing.taskId,
        data: {
          ...base,
          employeeId: values.assigneeType === "employee" ? only : null,
          memberId: values.assigneeType === "member" ? only : null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        ...base,
        employeeIds: values.assigneeType === "employee" ? ids : undefined,
        memberIds: values.assigneeType === "member" ? ids : undefined,
      });
    }
    setFormOpen(false);
  });

  const columns = useMemo<ColumnDef<PerformanceTask, any>[]>(
    () => [
      columnHelper.accessor("title", {
        header: "Task",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-semibold text-ink">{row.original.title}</p>
            {row.original.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{row.original.description}</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("assigneeName", {
        header: "Assigned to",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-ink">{row.original.assigneeName || "—"}</p>
            <p className="text-[11px] capitalize text-ink-muted">
              {row.original.assigneeType}
              {row.original.employeeCode || row.original.memberCode
                ? ` · ${row.original.employeeCode || row.original.memberCode}`
                : ""}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: ({ row }) => {
          const value = row.original.priority;
          return (
            <span
              className={cn(
                "inline-flex rounded-none px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                PRIORITY_STYLES[value]
              )}
            >
              {value}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge className={STATUS_STYLES[row.original.status]}>{row.original.status}</Badge>
            {isOverdue(row.original) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due",
        cell: (info) => (info.getValue() ? formatDate(info.getValue()!) : "—"),
      }),
      columnHelper.display({ id: "actions", header: "", cell: () => null }),
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance tasks"
        subtitle="Assign and track work for employees and members."
        actions={
          canCreate ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Assign task
            </Button>
          ) : undefined
        }
      />

      <StatCardsGrid cols={4}>
        <StatCard label="To do" value={String(stats?.todo ?? 0)} icon={<ListTodo className="h-5 w-5" />} />
        <StatCard
          label="In progress"
          value={String(stats?.inProgress ?? 0)}
          icon={<CircleDot className="h-5 w-5" />}
        />
        <StatCard label="Done" value={String(stats?.done ?? 0)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard
          label="Overdue"
          value={String(stats?.overdue ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </StatCardsGrid>

      <FilterBar>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            { value: "Todo", label: "Todo" },
            { value: "In Progress", label: "In Progress" },
            { value: "Done", label: "Done" },
            { value: "Cancelled", label: "Cancelled" },
          ]}
          className="w-auto min-w-[9.5rem]"
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: "", label: "All priorities" },
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
          ]}
          className="w-auto min-w-[9.5rem]"
        />
        <Select
          value={assigneeFilter}
          onChange={(e) => {
            setAssigneeFilter(e.target.value);
            setEmployeeFilter("");
            setMemberFilter("");
          }}
          options={[
            { value: "", label: "Everyone" },
            { value: "employee", label: "Employees" },
            { value: "member", label: "Members" },
          ]}
          className="w-auto min-w-[9.5rem]"
        />
        {assigneeFilter === "employee" && (
          <Select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            options={[
              { value: "", label: "All employees" },
              ...employees.map((e) => ({
                value: String(e.employeeId),
                label: `${e.fullName} (${e.employeeCode})`,
              })),
            ]}
            className="w-auto min-w-[12rem] max-w-[16rem]"
          />
        )}
        {assigneeFilter === "member" && (
          <Select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            options={[
              { value: "", label: "All members" },
              ...members.map((m) => ({
                value: String(m.memberId),
                label: `${m.memberName}${m.memberCode ? ` (${m.memberCode})` : ""}`,
              })),
            ]}
            className="w-auto min-w-[12rem] max-w-[16rem]"
          />
        )}
        <DateRangeFilter
          mode={dateMode}
          onModeChange={setDateMode}
          date={dayFilter}
          from={fromFilter}
          to={toFilter}
          onDateChange={setDayFilter}
          onFromChange={setFromFilter}
          onToChange={setToFilter}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={tasks}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search tasks…"
        emptyTitle="No tasks yet"
        emptyDescription="Assign a task to an employee or member to start tracking performance."
        getRowId={(row) => String(row.taskId)}
        actions={(row) => {
          const items = [];
          if (canEdit) {
            items.push({
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => openEdit(row),
            });
            if (row.status !== "Done" && row.status !== "Cancelled") {
              items.push({
                label: "Mark done",
                icon: <CheckCircle2 className="h-4 w-4" />,
                onClick: () => updateMutation.mutate({ id: row.taskId, data: { status: "Done" } }),
              });
            }
          }
          if (canDelete) {
            items.push({
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => {
                // Defer so the ⋯ menu can close before the confirm dialog opens.
                window.setTimeout(async () => {
                  const ok = await confirmDialog({
                    title: "Delete this task?",
                    text: `"${row.title}" will be removed from the board.`,
                    confirmText: "Delete",
                  });
                  if (ok) deleteMutation.mutate(row.taskId);
                }, 0);
              },
            });
          }
          return items;
        }}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit task" : "Assign task"}
        subtitle="Track performance work for staff or co-founders."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending || updateMutation.isPending}
              leftIcon={<ClipboardList className="h-4 w-4" />}
              onClick={() => void onSave()}
            >
              {editing ? "Save changes" : "Assign task"}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => void onSave(e)} className="space-y-4">
          <Input
            label="Title"
            required
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />
          <Textarea label="Description" rows={3} {...register("description")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Priority"
              required
              options={[
                { value: "Low", label: "Low" },
                { value: "Medium", label: "Medium" },
                { value: "High", label: "High" },
              ]}
              {...register("priority", { required: true })}
            />
            <Select
              label="Status"
              required
              options={[
                { value: "Todo", label: "Todo" },
                { value: "In Progress", label: "In Progress" },
                { value: "Done", label: "Done" },
                { value: "Cancelled", label: "Cancelled" },
              ]}
              {...register("status", { required: true })}
            />
            <Input label="Due date" type="date" {...register("dueDate")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <Select
              label="Assign to"
              required
              options={[
                { value: "employee", label: "Employees" },
                { value: "member", label: "Members" },
              ]}
              {...register("assigneeType", {
                required: true,
                onChange: () => setValue("assigneeIds", []),
              })}
            />
            <Controller
              name="assigneeIds"
              control={control}
              rules={{
                validate: (v) => {
                  if (!Array.isArray(v) || v.length === 0) {
                    return assigneeType === "member"
                      ? "Select at least one member"
                      : "Select at least one employee";
                  }
                  if (editing && v.length > 1) return "Editing keeps one assignee — pick a single person";
                  return true;
                },
              }}
              render={({ field }) => (
                <MultiSelect
                  label={assigneeType === "member" ? "Members" : "Employees"}
                  required
                  error={errors.assigneeIds?.message}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  emptyText={
                    assigneeType === "member" ? "No active members" : "No active employees"
                  }
                  options={
                    assigneeType === "member"
                      ? members.map((m) => ({
                          value: String(m.memberId),
                          label: `${m.memberName}${m.memberCode ? ` (${m.memberCode})` : ""}`,
                        }))
                      : employees.map((e) => ({
                          value: String(e.employeeId),
                          label: `${e.fullName} (${e.employeeCode})`,
                        }))
                  }
                />
              )}
            />
          </div>
        </form>
      </Modal>

      {!canManage && !canCreate && !canEdit && (
        <p className="text-sm text-ink-muted">You can view tasks. Ask an admin for assign permissions to create or edit.</p>
      )}
    </div>
  );
}
