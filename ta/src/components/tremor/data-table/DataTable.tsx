// Tremor dashboard template DataTable, made generic for Skwyd lists:
// filter bar (search, column filters, export, column view options), sortable headers, row selection with a
// command bar for bulk actions, a ••• menu per row, and "Showing x–y of z" pagination.
import * as React from "react";
import {
  type ColumnDef, type ColumnFiltersState, type FilterFn, type Row, type RowSelectionState, type SortingState, type VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table";
import { RiDownloadLine, RiMoreFill } from "@remixicon/react";
import { useDebouncedCallback } from "use-debounce";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../Table";
import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { Searchbar } from "../Searchbar";
import { cx } from "../utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../Dropdown";
import { CommandBar, CommandBarBar, CommandBarCommand, CommandBarSeperator, CommandBarValue } from "../CommandBar";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import { FilterMulti, FilterSelect } from "./FilterSelect";
import { DataTablePagination } from "./DataTablePagination";
import { ViewOptions } from "./DataTableViewOptions";
import { sortValue, textOf } from "./textOf";

export type DTColumn<T> = {
  id: string;
  title: string;
  /** value used for sorting, searching and filtering */
  value?: (r: T) => string | number;
  cell?: (r: T) => React.ReactNode;
  num?: boolean;
  sortable?: boolean;
  hideable?: boolean;
  className?: string;
};
export type DTFilter = { column: string; title: string; options: { label: string; value: string }[]; type?: "select" | "checkbox" };
export type DTAction<T> = { label: string; onSelect: (r: T) => void; danger?: boolean; hidden?: (r: T) => boolean };
export type DTBulk<T> = { label: string; action: (rows: T[]) => void | Promise<void>; shortcut?: string };

const includesFilter: FilterFn<any> = (row, id, v) => {
  const val = String(row.getValue(id) ?? "");
  return Array.isArray(v) ? !v.length || v.includes(val) : !v || val === v;
};

export function DataTable<T>({
  data, columns, getRowId, searchPlaceholder = "Search...", filters = [], toolbar, actions, rowActions, bulk, onRowClick, onExport,
  empty = "No results.", pageSize = 20, initialSort, searchText, server,
}: {
  data: T[];
  columns: DTColumn<T>[];
  getRowId?: (r: T) => string;
  searchPlaceholder?: string | false;
  filters?: DTFilter[];
  /** left of the search (e.g. tabs) */
  toolbar?: React.ReactNode;
  /** right side buttons (e.g. Add) */
  actions?: React.ReactNode;
  rowActions?: DTAction<T>[];
  bulk?: DTBulk<T>[];
  onRowClick?: (r: T) => void;
  onExport?: (rows: T[]) => void;
  empty?: React.ReactNode;
  pageSize?: number;
  initialSort?: SortingState;
  /** text searched by the search box (default: every column value) */
  searchText?: (r: T) => string;
  /** rows paged and searched on the server: data is one page */
  server?: { page: number; total: number; onPage: (page: number) => void; search: string; onSearch: (q: string) => void };
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>(initialSort || []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [term, setTerm] = React.useState("");
  const setGlobal = useDebouncedCallback((v: string) => (server ? server.onSearch(v) : setGlobalFilter(v)), 250);
  React.useEffect(() => { if (server) setTerm(server.search); }, [server?.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const defs = React.useMemo<ColumnDef<T, any>[]>(() => {
    const out: ColumnDef<T, any>[] = [];
    if (bulk?.length) out.push({
      id: "select",
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
        onCheckedChange={() => table.toggleAllPageRowsSelected()} className="translate-y-0.5" aria-label="Select all" />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={() => row.toggleSelected()} onClick={e => e.stopPropagation()} className="translate-y-0.5" aria-label="Select row" />,
      enableSorting: false, enableHiding: false, meta: { displayName: "Select", className: "w-10" },
    });
    for (const c of columns) out.push({
      id: c.id,
      accessorFn: (r: T) => (c.value ? c.value(r) : c.cell ? sortValue(c.cell(r)) : ""),
      header: ({ column }) => <DataTableColumnHeader column={column} title={c.title} className={c.num ? "justify-end" : undefined} />,
      cell: ({ row, getValue }) => (c.cell ? c.cell(row.original) : (getValue() as React.ReactNode)),
      enableSorting: c.sortable !== false,
      enableHiding: c.hideable !== false,
      filterFn: includesFilter,
      meta: { displayName: c.title, className: cx(c.num ? "text-right tabular-nums" : "text-left", c.className) },
    });
    if (rowActions?.length) out.push({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowMenu row={row} actions={rowActions} />,
      enableSorting: false, enableHiding: false, meta: { displayName: "Actions", className: "w-12 text-right" },
    });
    return out;
  }, [columns, rowActions, bulk]);

  const table = useReactTable({
    data, columns: defs, getRowId: getRowId as any,
    state: { rowSelection, sorting, columnFilters, columnVisibility, globalFilter, ...(server ? { pagination: { pageIndex: server.page - 1, pageSize } } : {}) },
    initialState: { pagination: { pageIndex: 0, pageSize } },
    manualPagination: !!server,
    pageCount: server ? Math.max(1, Math.ceil(server.total / pageSize)) : undefined,
    onPaginationChange: server ? (u: any) => { const n = typeof u === "function" ? u({ pageIndex: server.page - 1, pageSize }) : u; server.onPage(n.pageIndex + 1); } : undefined,
    enableRowSelection: !!bulk?.length,
    onRowSelectionChange: setRowSelection, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility, onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, v) => {
      const needle = String(v || "").toLowerCase();
      return !needle || (searchText ? searchText(row.original).toLowerCase().includes(needle) : columns.some(c => String(c.value ? c.value(row.original) ?? "" : c.cell ? textOf(c.cell(row.original)) : "").toLowerCase().includes(needle)));
    },
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  const selected = table.getSelectedRowModel().rows.map(r => r.original);
  const isFiltered = columnFilters.length > 0 || !!globalFilter || !!server?.search;

  return (
    <div className="space-y-3">
      {/* Filterbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-x-6">
        <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-center">
          {toolbar}
          {filters.map(f => { const col = table.getColumn(f.column); if (!col?.getIsVisible()) return null;
            const v = col.getFilterValue() as any;
            return f.type === "select"
              ? <FilterSelect key={f.column} title={f.title} options={f.options} value={(v as string) || ""} onChange={x => col.setFilterValue(x || undefined)} />
              : <FilterMulti key={f.column} title={f.title} options={f.options} value={(v as string[]) || []} onChange={x => col.setFilterValue(x.length ? x : undefined)} />; })}
          {searchPlaceholder !== false && (
            <Searchbar type="search" placeholder={searchPlaceholder} value={term}
              onChange={e => { setTerm(e.target.value); setGlobal(e.target.value); }}
              className="w-full sm:max-w-[250px] sm:[&>input]:h-[30px]" />
          )}
          {isFiltered && (
            <Button variant="ghost" onClick={() => { table.resetColumnFilters(); setTerm(""); setGlobalFilter(""); server?.onSearch(""); }}
              className="border border-gray-200 px-2 font-semibold text-blue-600 sm:border-none sm:py-1 dark:border-gray-800 dark:text-blue-500">
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="secondary" className="hidden gap-x-2 px-2 py-1.5 text-sm sm:text-xs lg:flex" onClick={() => onExport(table.getFilteredRowModel().rows.map(r => r.original))}>
              <RiDownloadLine className="size-4 shrink-0" aria-hidden="true" />Export
            </Button>
          )}
          <ViewOptions table={table} />
          {actions}
        </div>
      </div>

      <div className="relative overflow-hidden overflow-x-auto">
        <Table>
          <TableHead>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-y border-gray-200 dark:border-gray-800">
                {hg.headers.map(h => (
                  <TableHeaderCell key={h.id} className={cx("whitespace-nowrap py-1 text-sm sm:text-xs", h.column.columnDef.meta?.className)}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHeaderCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id}
                onClick={() => (onRowClick ? onRowClick(row.original) : bulk?.length ? row.toggleSelected(!row.getIsSelected()) : undefined)}
                className={cx("group select-none hover:bg-gray-50 hover:dark:bg-gray-900", onRowClick && "cursor-pointer")}>
                {row.getVisibleCells().map((cell, i) => (
                  <TableCell key={cell.id}
                    className={cx(row.getIsSelected() ? "bg-gray-50 dark:bg-gray-900" : "", "relative whitespace-nowrap py-2 text-gray-600 dark:text-gray-400", cell.column.columnDef.meta?.className)}>
                    {i === 0 && row.getIsSelected() && <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-600 dark:bg-blue-500" />}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={defs.length} className="h-24 text-center">{empty}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {!!bulk?.length && (
          <CommandBar open={selected.length > 0}>
            <CommandBarBar>
              <CommandBarValue>{selected.length} selected</CommandBarValue>
              {bulk.map(b => (
                <React.Fragment key={b.label}>
                  <CommandBarSeperator />
                  <CommandBarCommand label={b.label} action={async () => { await b.action(selected); table.resetRowSelection(); }} shortcut={{ shortcut: b.shortcut || b.label[0].toLowerCase() }} />
                </React.Fragment>
              ))}
              <CommandBarSeperator />
              <CommandBarCommand label="Reset" action={() => table.resetRowSelection()} shortcut={{ shortcut: "Escape", label: "esc" }} />
            </CommandBarBar>
          </CommandBar>
        )}
      </div>
      <DataTablePagination table={table} pageSize={pageSize} selectable={!!bulk?.length} total={server?.total} />
    </div>
  );
}

function RowMenu<T>({ row, actions }: { row: Row<T>; actions: DTAction<T>[] }) {
  const list = actions.filter(a => !a.hidden?.(row.original));
  if (!list.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" onClick={e => e.stopPropagation()} aria-label="Row actions"
          className="group aspect-square p-1.5 hover:border hover:border-gray-300 data-[state=open]:border-gray-300 data-[state=open]:bg-gray-50 hover:dark:border-gray-700 data-[state=open]:dark:border-gray-700 data-[state=open]:dark:bg-gray-900">
          <RiMoreFill className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-data-[state=open]:text-gray-700 group-hover:dark:text-gray-300 group-data-[state=open]:dark:text-gray-300" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[110] min-w-40" onClick={e => e.stopPropagation()}>
        {list.map(a => <DropdownMenuItem key={a.label} onSelect={() => a.onSelect(row.original)} className={a.danger ? "text-red-600 dark:text-red-500" : undefined}>{a.label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
