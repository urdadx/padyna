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
import { useState, useMemo } from "react";

import { cn } from "@/lib/utils";
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
import { ActionsPopover } from "./actions-popover";
import { MultiSelectToolbar } from "../multi-select-toolbar";
import { CreateActionDialog } from "./create-action-dialog";

export type ActionItem = {
	id: string;
	name: string;
	description: string;
	noUsed: number;
	status: "Active" | "Inactive";
	type: "Calendly" | "Cal" | "custom" | "Jira" | "Slack";
};

type ActionRow = {
	id: string;
	name: string;
	actionType: "jira" | "calendly" | "slack" | "cal";
	status: "inactive" | "active";
	timesUsed: number;
	description: string;
};

function mapActionToItem(db: ActionRow): ActionItem {
	return {
		id: db.id,
		name: db.name,
		description: db.description,
		noUsed: db.timesUsed,
		status: db.status === "active" ? "Active" : "Inactive",
		type:
			db.actionType === "calendly"
				? "Calendly"
				: db.actionType === "cal"
					? "Cal"
					: db.actionType === "slack"
						? "Slack"
						: "Jira",
	};
}

const columns: ColumnDef<ActionItem>[] = [
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
			return (
				<div className="font-normal">
					<span className="truncate max-w-xs">{row.getValue("name")}</span>
				</div>
			);
		},

		header: "Name",
		size: 200,
	},
	{
		accessorKey: "description",
		header: "Description",
	},
	{
		accessorKey: "noUsed",
		header: "# times used",
		cell: ({ row }) => (
			<span className="flex justify-center">{row.getValue("noUsed")}</span>
		),
	},

	{
		accessorKey: "status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<div
					className={cn(
						"text-xs w-max font-normal border rounded-sm px-2 py-0.5 ",
						status === "Active" &&
							"bg-green-50 text-green-500  border-green-500/20",
						status === "Inactive" &&
							"bg-gray-50 text-gray-600  border-gray-500/20",
					)}>
					{status}
				</div>
			);
		},
		filterFn: "equalsString",
		header: "Status",
	},
	{
		cell: ({ row }) => <ActionsPopover item={row.original} />,
		header: "Action",
		id: "actions",
	},
];

type ActionsTableProps = {
	data?: ActionRow[];
	isLoading?: boolean;
};

export function ActionsTable({ data, isLoading }: ActionsTableProps) {
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

	const tableData = useMemo(() => data?.map(mapActionToItem) ?? [], [data]);

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
							placeholder="Search actions..."
							className="w-full h-9 pl-9"
							value={
								(table
									.getColumn("name")
									?.getFilterValue() as string) ?? ""
							}
							onChange={(event) =>
								table
									.getColumn("name")
									?.setFilterValue(event.target.value)
							}
						/>
						<SearchLinear className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 cal-muted-foreground" />
					</div>
				</div>
				<CreateActionDialog />
			</div>
			<div className="rounded-xl border bg-background overflow-x-auto">
				<Table className="">
					<TableHeader className="bg-gray-50 w-full">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								className="hover:bg-transparent cal-center  "
								key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											className="h-11"
											key={header.id}
											style={{
												width: `${header.getSize()}px`,
											}}>
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
															(e.key ===
																"Enter" ||
																e.key ===
																	" ")
														) {
															e.preventDefault();
															header.column.getToggleSortingHandler()?.(
																e,
															);
														}
													}}
													tabIndex={
														header.column.getCanSort()
															? 0
															: undefined
													}>
													{flexRender(
														header.column
															.columnDef
															.header,
														header.getContext(),
													)}
												</div>
											) : (
												flexRender(
													header.column
														.columnDef
														.header,
													header.getContext(),
												)
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
									className="h-64 cal-center w-full justify-center"
									colSpan={columns.length}>
									<div className="flex flex-col items-center justify-center gap-2">
										<p className="cal-sm cal-muted-foreground">
											Loading actions...
										</p>
									</div>
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									data-state={row.getIsSelected() && "selected"}
									key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											className="h-14"
											key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									className="h-64 cal-center w-full"
									colSpan={columns.length}>
									No actions found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<TablePagination showFileSize={false} table={table} isLoading={isLoading} />

			{isAnySelected && (
				<MultiSelectToolbar
					isAllSelected={isAllSelected}
					onSelectAll={() => table.toggleAllPageRowsSelected(!isAllSelected)}
					onDelete={() => {}}
					onClose={() => table.resetRowSelection()}
				/>
			)}
		</div>
	);
}
