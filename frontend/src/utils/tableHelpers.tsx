import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatTime } from "@/utils/format";

const dateCellClass = "text-xs font-medium text-slate-500 dark:text-slate-400";
const timeCellClass = "text-xs text-slate-400 dark:text-slate-500";

export function dateColumn<T>(
  id: string,
  header: string,
  getValue: (row: T) => string | null | undefined
): ColumnDef<T, any> {
  return {
    id,
    header,
    accessorFn: (row) => getValue(row) ?? "",
    cell: ({ row }) => <span className={dateCellClass}>{formatDate(getValue(row.original) ?? undefined)}</span>,
  };
}

export function timeColumn<T>(getValue: (row: T) => string | null | undefined): ColumnDef<T, any> {
  return {
    id: "time",
    header: "Time",
    cell: ({ row }) => <span className={timeCellClass}>{formatTime(getValue(row.original) ?? undefined)}</span>,
  };
}

export function dateTimeColumns<T>(
  id: string,
  header: string,
  getDate: (row: T) => string | null | undefined,
  getTime?: (row: T) => string | null | undefined
): ColumnDef<T, any>[] {
  const timeFn = getTime ?? getDate;
  return [dateColumn(id, header, getDate), timeColumn(timeFn)];
}
