import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type PaginationState,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";

import { cn, formatFileSize, timeAgo } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination } from "@/components/datasource/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "../ui/input";
import { SearchLinear } from "@/assets/icons/search-icon";
import { DatabaseLinear } from "@/assets/icons/database-icon";
import { AddSource } from "./add-source";
import { FilterByTypes } from "./filter-by-types";
import { FilterByStatus } from "./filter-by-status";
import { MultiSelectToolbar } from "../multi-select-toolbar";
import { CuteIconWrapper } from "../cute-icon-wrapper";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { TextLinear } from "@/assets/icons/text-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { PaperclipLinear } from "@/assets/icons/paperclip-icon";
import { DataSourceActions } from "./datasource-actions";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import Spinner from "../ui/spinner";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type Item = {
  id: string;
  name: string;
  lastSynced: string;
  fileSize: string;
  noReferenced: number;
  status: "Synced" | "Processing" | "Failed";
  type: "File" | "Text" | "Q&A" | "Link";
  url?: string;
  question?: string;
  answer?: string;
  contentText?: string;
};

type DatasourceRow = {
  id: string;
  sourceName: string;
  sourceType: "link" | "file" | "qa" | "text";
  ingestStatus: "pending" | "processing" | "synced" | "failed" | "archived";
  timesReferenced: number;
  sizeBytes: number | null;
  lastSyncedAt: Date | string | null;
  url: string | null;
  question: string | null;
  answer: string | null;
  contentText: string | null;
};

function mapDatasourceToItem(db: DatasourceRow): Item {
  return {
    id: db.id,
    name: db.sourceName,
    lastSynced: timeAgo(db.lastSyncedAt),
    fileSize: formatFileSize(db.sizeBytes || 0),
    noReferenced: db.timesReferenced,
    status:
      db.ingestStatus === "synced"
        ? "Synced"
        : db.ingestStatus === "failed"
          ? "Failed"
          : "Processing",
    type:
      db.sourceType === "file"
        ? "File"
        : db.sourceType === "text"
          ? "Text"
          : db.sourceType === "qa"
            ? "Q&A"
            : "Link",
    url: db.url ?? undefined,
    question: db.question ?? undefined,
    answer: db.answer ?? undefined,
    contentText: db.contentText ?? undefined,
  };
}

const columns: ColumnDef<Item>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    id: "select",
    size: 40,
  },
  {
    accessorKey: "name",
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <div className="font-normal flex gap-2 items-center">
          <CuteIconWrapper
            icon={
              type === "Link"
                ? GlobeLinear
                : type === "Text"
                  ? TextLinear
                  : type === "File"
                    ? PaperclipLinear
                    : ChatLinear
            }
            color={
              type === "Link"
                ? "green"
                : type === "Text"
                  ? "orange"
                  : type === "File"
                    ? "violet"
                    : type === "Q&A"
                      ? "gray"
                      : "purple"
            }
          />
          <span className="truncate max-w-xs">{row.getValue("name")}</span>
        </div>
      );
    },

    header: "Source name",
    size: 200,
  },
  {
    accessorKey: "lastSynced",
    header: "Last synced",
  },
  {
    accessorKey: "noReferenced",
    header: "# times referenced",
    cell: ({ row }) => <span className="flex justify-center">{row.getValue("noReferenced")}</span>,
  },
  {
    accessorKey: "fileSize",
    header: "File size",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <div
          className={cn(
            "text-xs w-max font-normal border rounded-sm px-2 py-0.5 ",
            status === "Synced" && "bg-green-50 text-green-500  border-green-500/20",
            status === "Processing" && "bg-amber-50 text-amber-500  border-amber-500/20",
            status === "Failed" && "bg-red-50 text-red-500 border-red-500/20",
          )}
        >
          {status}
        </div>
      );
    },
    filterFn: "equalsString",
    header: "Status",
  },
  {
    accessorKey: "type",
    filterFn: "equalsString",
  },
  {
    cell: ({ row }) => <DataSourceActions item={row.original} />,
    header: "Action",
    id: "actions",
  },
];

export function DataSourceTable() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState<SortingState>([
    {
      desc: false,
      id: "name",
    },
  ]);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: datasources, isLoading } = useQuery({
    ...trpc.datasource.getAll.queryOptions(),
    refetchOnMount: true,
  });

  const deleteMany = useMutation({
    mutationFn: async (data: { ids: string[] }) => {
      return trpcClient.datasource.deleteMany.mutate(data);
    },
    onSuccess: () => {
      table.resetRowSelection();
      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getAll.queryOptions().queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getSourceCounts.queryOptions().queryKey,
      });
      toast.success("Deleted selected data sources");
    },
    onError: () => {
      toast.error("Failed to delete data sources. Please try again.");
    },
  });

  const tableData = useMemo(() => datasources?.map(mapDatasourceToItem) ?? [], [datasources]);
  const totalSize = useMemo(
    () =>
      formatFileSize(
        (datasources ?? []).reduce(
          (total: number, datasource: DatasourceRow) => total + (datasource.sizeBytes ?? 0),
          0,
        ),
      ),
    [datasources],
  );

  const table = useReactTable({
    columns,
    data: tableData,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility: {
        type: false,
      },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const isAnySelected = selectedRows.length > 0;
  const isAllSelected = table.getIsAllPageRowsSelected();

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-2">
        <div className="flex w-full flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative w-full sm:max-w-sm">
            <Input
              placeholder="Search data sources..."
              className="w-full h-9 pl-9"
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            />
            <SearchLinear className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterByTypes
              value={(table.getColumn("type")?.getFilterValue() as string) ?? undefined}
              onChange={(value) => table.getColumn("type")?.setFilterValue(value)}
            />
            <FilterByStatus
              value={(table.getColumn("status")?.getFilterValue() as string) ?? undefined}
              onChange={(value) => table.getColumn("status")?.setFilterValue(value)}
            />
          </div>
        </div>
        <div className="w-full lg:w-auto flex justify-start sm:justify-end">
          <AddSource />
        </div>
      </div>
      <div className="rounded-xl border bg-background overflow-x-auto">
        <Table className="">
          <TableHeader className="bg-gray-50 w-full">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className="hover:bg-transparent text-center  " key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      className="h-11"
                      key={header.id}
                      style={{
                        width: `${header.getSize()}px`,
                      }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            header.column.getCanSort() &&
                              "flex h-full cursor-pointer select-none items-center justify-between gap-2",
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (
                              header.column.getCanSort() &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  className="h-64 text-center w-full justify-center"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner size={30} />
                    <p className="text-sm text-muted-foreground">Loading data sources...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow data-state={row.getIsSelected() && "selected"} key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="h-14" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-64 text-center w-full" colSpan={columns.length}>
                  <div className="relative inline-block">
                    <div
                      className="bg-gray-50 max-w-2xl mx-auto flex items-center mb-2 size-20 shrink-0 justify-center rounded-full border"
                      aria-hidden="true"
                    >
                      <DatabaseLinear className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <span className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground border-2 border-background">
                      0
                    </span>
                  </div>
                  <p className="mt-4 text-base font-medium">No data sources added</p>
                  <p className="text-sm my-2 text-muted-foreground">
                    Add a data source to provide knowledge for your AI agent.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} totalSize={totalSize} isLoading={isLoading} />

      {isAnySelected && (
        <MultiSelectToolbar
          isAllSelected={isAllSelected}
          onSelectAll={() => table.toggleAllPageRowsSelected(!isAllSelected)}
          onCopyUrls={() => {
            const urls = selectedRows
              .map((row) => row.original.url)
              .filter(Boolean)
              .join("\n");
            if (urls) {
              navigator.clipboard.writeText(urls);
            }
          }}
          onDelete={() => {
            deleteMany.mutate({
              ids: selectedRows.map((r) => r.original.id),
            });
          }}
          onClose={() => table.resetRowSelection()}
        />
      )}
    </div>
  );
}
