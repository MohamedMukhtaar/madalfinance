import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { RowActions, type RowAction } from "@/components/ui/RowActions";
import { TableCheck } from "@/components/ui/TableCheck";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

/** Row action for DataTable — `overflow: true` forces the item into the ⋯ menu. */
export type DataTableAction = DropdownItem & { overflow?: boolean };

export interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  showColumnToggle?: boolean;
  /** DreamPOS leading checkboxes. Default true. */
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  actions?: (row: T) => DataTableAction[];
  /** Max icon buttons before ⋯ menu (DreamPOS uses 3). */
  maxActionIcons?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  error?: unknown;
  onRetry?: () => void;
  getRowId?: (row: T) => string;
  initialSorting?: SortingState;
  className?: string;
  serverSide?: boolean;
  totalCount?: number;
  pageIndex?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  renderMobileCard?: (row: T) => ReactNode;
  onSelectionChange?: (rows: T[]) => void;
}

function toRowActions(items: DataTableAction[]): RowAction[] {
  return items
    .filter((action) => !action.divider && action.icon)
    .map((action) => ({
      label: typeof action.label === "string" ? action.label : "Action",
      icon: action.icon,
      onClick: action.onClick ?? (() => undefined),
      danger: action.danger,
      disabled: action.disabled,
      overflow: action.overflow,
    }));
}

export function DataTable<T>({
  columns,
  data,
  loading,
  searchable = true,
  searchPlaceholder = "Search",
  showColumnToggle = false,
  selectable = true,
  pagination = true,
  pageSize = 8,
  pageSizeOptions = [5, 8, 12, 20],
  onRowClick,
  toolbar,
  actions,
  maxActionIcons = 3,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  error,
  onRetry,
  getRowId,
  initialSorting = [],
  className,
  serverSide = false,
  totalCount,
  pageIndex: controlledPageIndex,
  onPageChange,
  onPageSizeChange,
  renderMobileCard,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [tablePageSize, setTablePageSize] = useState(pageSize);
  const [localPageIndex, setLocalPageIndex] = useState(0);

  const pageIndex = serverSide ? (controlledPageIndex ?? 0) : localPageIndex;
  const rowTotal = serverSide ? (totalCount ?? 0) : undefined;

  useEffect(() => {
    setTablePageSize(pageSize);
  }, [pageSize]);

  const selectColumn = useMemo<ColumnDef<T, unknown>>(
    () => ({
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table: t }) => (
        <TableCheck
          aria-label="Select all"
          checked={t.getIsAllPageRowsSelected()}
          indeterminate={t.getIsSomePageRowsSelected()}
          onChange={t.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <TableCheck
          aria-label="Select row"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
    []
  );

  const tableColumns = useMemo(
    () => (selectable ? [selectColumn, ...columns] : columns),
    [selectable, selectColumn, columns]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize: tablePageSize },
    },
    getRowId: getRowId as never,
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(serverSide
      ? {
          manualPagination: true,
          pageCount: Math.max(1, Math.ceil((rowTotal ?? 0) / tablePageSize) || 1),
        }
      : { getPaginationRowModel: getPaginationRowModel() }),
  });

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange(table.getSelectedRowModel().rows.map((r) => r.original));
  }, [rowSelection, onSelectionChange, table]);

  const goToPage = (next: number) => {
    if (serverSide) onPageChange?.(next);
    else setLocalPageIndex(next);
    table.setPageIndex(next);
  };

  const changePageSize = (size: number) => {
    setTablePageSize(size);
    table.setPageSize(size);
    if (serverSide) {
      onPageSizeChange?.(size);
      onPageChange?.(0);
    } else {
      setLocalPageIndex(0);
    }
  };

  const toggleableColumns = useMemo(
    () => table.getAllLeafColumns().filter((c) => c.getCanHide() && c.id !== "select"),
    [table]
  );

  const { pageIndex: currentPageIndex } = table.getState().pagination;
  const totalRows = serverSide
    ? (rowTotal ?? 0)
    : table.getPrePaginationRowModel().rows.length;
  const pageCount = serverSide
    ? Math.max(1, Math.ceil(totalRows / tablePageSize) || 1)
    : table.getPageCount();
  const visibleRows = table.getRowModel().rows;
  const colCount = table.getVisibleLeafColumns().length;
  const selectedCount = Object.keys(rowSelection).length;

  return (
    <Card className={cn("overflow-hidden shadow-sm", className)} animated={false}>
      {/* Toolbar — DreamPOS search left / filters right */}
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {searchable && (
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder={searchPlaceholder}
              className="w-full sm:max-w-[240px]"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {showColumnToggle && (
            <Dropdown
              width="w-52"
              trigger={
                <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-panel px-3 text-sm font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-muted">
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
                    <TableCheck
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    <span className="capitalize">
                      {String(column.columnDef.header).replace(/_/g, " ")}
                    </span>
                  </label>
                ),
                onClick: () => undefined,
              }))}
            />
          )}
        </div>
      </div>

      {/* Mobile cards */}
      {renderMobileCard && !loading && !error && visibleRows.length > 0 && (
        <div className="divide-y divide-line p-3 md:hidden">
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className={cn("flex gap-3 py-3", onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(row.original)}
            >
              {selectable && (
                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                  <TableCheck
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {renderMobileCard(row.original)}
                {actions && (
                  <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      maxVisible={maxActionIcons}
                      actions={toRowActions(actions(row.original))}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table — DreamPOS `.table.custom-table` */}
      <div className={cn("overflow-x-auto", renderMobileCard && "hidden md:block")}>
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                  <th
                    key={header.id}
                    className={cn(
                      "sticky top-0 z-10 whitespace-nowrap border-b border-line bg-[color-mix(in_srgb,var(--brand-secondary)_12%,white)] px-4 py-2.5 text-sm font-semibold leading-snug text-ink",
                      "dark:bg-[color-mix(in_srgb,var(--brand-secondary)_18%,var(--color-card))]",
                      header.id === "select" && "w-12 px-3",
                      (header.id === "actions" || header.id === "action") && "text-center"
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 text-ink transition hover:text-[var(--brand-primary)]"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {/* DreamPOS: hide unsorted arrows; show chevron only when active */}
                        {sorted === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-[var(--brand-primary)]" strokeWidth={2.5} />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--brand-primary)]" strokeWidth={2.5} />
                        ) : null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={Math.max(colCount, 1)} className="px-5 py-6">
                  <SkeletonTable rows={6} cols={Math.max(colCount, 1)} />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={Math.max(colCount, 1)}>
                  <ErrorState onRetry={onRetry} />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(colCount, 1)}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "group border-b border-line last:border-0 transition-colors",
                    onRowClick && "cursor-pointer",
                    row.getIsSelected()
                      ? "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]"
                      : "hover:bg-muted/35"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActions = cell.column.id === "actions" || cell.column.id === "action";
                    const isSelect = cell.column.id === "select";
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "whitespace-nowrap px-4 py-2.5 text-[13px] leading-snug text-ink align-middle",
                          isSelect && "w-12 px-3",
                          isActions && "text-center"
                        )}
                        onClick={
                          isActions || isSelect ? (e) => e.stopPropagation() : undefined
                        }
                      >
                        {isActions && actions ? (
                          <RowActions
                            maxVisible={maxActionIcons}
                            actions={toRowActions(actions(row.original))}
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

      {/* Pagination — DreamPOS footer: Row Per Page … Entries + circular page pills */}
      {pagination && !loading && totalRows > 0 && (
        <div className="flex flex-col gap-3 border-t border-line px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span>Row Per Page</span>
            <select
              value={tablePageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-8 min-w-[3.25rem] rounded-md border border-line bg-panel px-2 text-sm font-medium text-ink focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>Entries</span>
            {selectedCount > 0 && (
              <span className="text-xs">
                ·{" "}
                <span className="font-semibold text-[var(--brand-primary)]">{selectedCount}</span>{" "}
                selected
              </span>
            )}
          </div>
          <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => goToPage(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex <= 0}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.max(pageCount, 1) }, (_, i) => i)
              .filter((i) => {
                const total = Math.max(pageCount, 1);
                if (total <= 7) return true;
                if (i === 0 || i === total - 1) return true;
                if (Math.abs(i - currentPageIndex) <= 1) return true;
                return false;
              })
              .reduce<number[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push(-1);
                acc.push(i);
                return acc;
              }, [])
              .map((i, key) =>
                i < 0 ? (
                  <span key={`e-${key}`} className="px-1 text-xs text-ink-muted">
                    …
                  </span>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i)}
                    aria-current={i === currentPageIndex ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition",
                      i === currentPageIndex
                        ? "bg-[var(--brand-primary)] text-white"
                        : "border border-line text-ink-soft hover:bg-muted"
                    )}
                  >
                    {i + 1}
                  </button>
                )
              )}
            <button
              type="button"
              onClick={() => goToPage(currentPageIndex + 1)}
              disabled={currentPageIndex + 1 >= pageCount}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
