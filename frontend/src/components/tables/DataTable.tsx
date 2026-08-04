import { useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { RowActions } from "@/components/ui/RowActions";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

export interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  showColumnToggle?: boolean;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  actions?: (row: T) => DropdownItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  error?: unknown;
  onRetry?: () => void;
  getRowId?: (row: T) => string;
  initialSorting?: SortingState;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  searchable = true,
  searchPlaceholder = "Search...",
  showColumnToggle = true,
  pagination = true,
  pageSize = 8,
  pageSizeOptions = [5, 8, 12, 20],
  onRowClick,
  toolbar,
  actions,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  error,
  onRetry,
  getRowId,
  initialSorting = [],
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [tablePageSize, setTablePageSize] = useState(pageSize);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    getRowId: getRowId as never,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: tablePageSize } },
  });

  const toggleableColumns = useMemo(
    () => table.getAllLeafColumns().filter((c) => c.getCanHide() && c.id !== "select"),
    [table]
  );

  const { pageIndex } = table.getState().pagination;
  const totalRows = table.getPrePaginationRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {searchable && (
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder={searchPlaceholder}
              className="w-full sm:max-w-xs"
            />
          )}
          {toolbar}
        </div>
        {showColumnToggle && (
          <Dropdown
            width="w-52"
            trigger={
              <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold text-ink-soft ring-1 ring-inset ring-line transition hover:bg-muted">
                <Columns3 className="h-4 w-4" />
                Columns
              </button>
            }
            items={toggleableColumns.map((column) => ({
              label: (
                <label
                  className="flex w-full cursor-pointer items-center gap-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="h-3.5 w-3.5 rounded accent-brand-600"
                  />
                  <span className="capitalize">{String(column.columnDef.header).replace(/_/g, " ")}</span>
                </label>
              ),
              onClick: () => undefined,
            }))}
          />
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500",
                      header.id === "actions" && "w-28 text-right"
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider transition hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-brand-600" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-6">
                  <SkeletonTable rows={6} cols={columns.length} />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length}>
                  <ErrorState onRetry={onRetry} />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "group transition-colors",
                    onRowClick && "cursor-pointer",
                    row.getIsSelected()
                      ? "bg-brand-50/60 dark:bg-brand-500/5"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActions = cell.column.id === "actions";
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300",
                          isActions && "text-right"
                        )}
                        onClick={isActions ? (e) => e.stopPropagation() : undefined}
                      >
                        {isActions && actions ? (
                          <RowActions
                            actions={actions(row.original)
                              .filter((action) => !action.divider && action.icon)
                              .map((action) => ({
                                label:
                                  typeof action.label === "string"
                                    ? action.label
                                    : "Action",
                                icon: action.icon,
                                onClick: action.onClick ?? (() => undefined),
                                danger: action.danger,
                                disabled: action.disabled,
                              }))}
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && totalRows > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {pageIndex * tablePageSize + 1}–{Math.min((pageIndex + 1) * tablePageSize, totalRows)}
            </span>{" "}
            of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalRows}</span>{" "}
            {Object.keys(rowSelection).length > 0 && (
              <>
                · <span className="font-semibold text-brand-600">{Object.keys(rowSelection).length}</span> selected
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={tablePageSize}
              onChange={(e) => {
                setTablePageSize(Number(e.target.value));
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 rounded-lg border-0 bg-muted px-2 text-xs font-semibold text-ink-soft ring-1 ring-inset ring-line focus:outline-none"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-slate-700 dark:hover:bg-slate-800"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[4.5rem] text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                {pageIndex + 1} / {Math.max(pageCount, 1)}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-slate-700 dark:hover:bg-slate-800"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
