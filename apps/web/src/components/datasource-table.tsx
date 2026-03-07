import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TablePagination } from "@/components/table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { RestartLinear } from "@/assets/icons/restart-icon";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { Input } from "./ui/input";
import { SearchLinear } from "@/assets/icons/search-icon";
import { DatabaseLinear } from "@/assets/icons/database-icon";
import { AddSource } from "./add-source";
import { FilterByTypes } from "./filter-by-types";
import { FilterByStatus } from "./filter-by-status";

type Item = {
	id: string;
	name: string;
	lastSynced: string;
	fileSize: string;
	type: string;
	status: "Completed" | "Processing" | "Failed";
};

const dummyData: Item[] = [
	{
		id: "1",
		name: "Customer_Feedback_Q1.csv",
		lastSynced: "2 days ago",
		fileSize: "1.2 MB",
		status: "Completed",
		type: "File",
	},
	{
		id: "2",
		name: "Refund Policy",
		lastSynced: "4 months ago",
		fileSize: "9.2 KB",
		status: "Processing",
		type: "Text",
	},
	{
		id: "3",
		name: "What does your product do?",
		lastSynced: "1 week ago",
		fileSize: "4.5 KB",
		status: "Processing",
		type: "Q&A",
	},
	{
		id: "4",
		name: "https://mywebsite.com",
		lastSynced: "1 minute ago",
		fileSize: "850 KB",
		status: "Failed",
		type: "Link",
	},
];

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
		cell: ({ row }) => <div className="font-normal">{row.getValue("name")}</div>,
		header: "Source name",
		size: 250,
	},
	{
		accessorKey: "lastSynced",
		header: "Last synced",
		size: 120,
	},
	{
		accessorKey: "type",
		header: "Source type",
		size: 120,
	},
	{
		accessorKey: "fileSize",
		header: "File size",
		size: 120,
	},
	{
		accessorKey: "status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<Badge
					className={cn(
						"font-medium",
						status === "Completed" &&
							"bg-green-500/15 text-green-500 hover:bg-green-500 border-green-500/20",
						status === "Processing" &&
							"bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20",
						status === "Failed" &&
							"bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20",
					)}
					variant="outline">
					{status}
				</Badge>
			);
		},
		header: "Status",
		size: 120,
	},
	{
		cell: () => (
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button className="h-8 w-8 p-0" variant="outline">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>
						<RestartLinear />
						Resync
					</DropdownMenuItem>
					<DropdownMenuItem className="text-destructive">
						<TrashBinLinear color="red" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
		header: "Action",
		id: "actions",
		size: 80,
	},
];

export function DataSourceTable() {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 5,
	});

	const [sorting, setSorting] = useState<SortingState>([
		{
			desc: false,
			id: "name",
		},
	]);

	const table = useReactTable({
		columns,
		data: dummyData,
		enableSortingRemoval: false,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: setPagination,
		onSortingChange: setSorting,
		state: {
			pagination,
			sorting,
		},
	});

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div className="flex w-full  items-center gap-2">
					<div className="relative">
						<Input
							placeholder="Search data sources..."
							className="max-w-3xl h-9 pl-9"
						/>
						<SearchLinear className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					</div>
					<FilterByTypes />
					<FilterByStatus />
				</div>
				<AddSource />
			</div>
			<div className="overflow-hidden rounded-xl border bg-background">
				<Table className="table-fixed ">
					<TableHeader className="bg-gray-50">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								className="hover:bg-transparent"
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
						{table.getRowModel().rows?.length ? (
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
									className="h-64 text-center "
									colSpan={columns.length}>
									<div className="relative inline-block">
										<div
											className="bg-gray-50 max-w-2xl mx-auto flex items-center mb-2 size-20 shrink-0 justify-center rounded-full border"
											aria-hidden="true">
											<DatabaseLinear className="h-10 w-10 text-muted-foreground" />
										</div>
										<span className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground border-2 border-background">
											0
										</span>
									</div>
									<p className="mt-4 text-base font-medium">
										No data sources added
									</p>
									<p className="text-sm my-2 text-muted-foreground">
										Add a data source to provide knowledge
										for your AI agent.
									</p>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<TablePagination table={table} />
		</div>
	);
}
