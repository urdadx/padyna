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
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination } from "@/components/table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "./ui/input";
import { SearchLinear } from "@/assets/icons/search-icon";
import { DatabaseLinear } from "@/assets/icons/database-icon";
import { AddSource } from "./add-source";
import { FilterByTypes } from "./filter-by-types";
import { FilterByStatus } from "./filter-by-status";
import { CuteIconWrapper } from "./cute-icon-wrapper";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { TextLinear } from "@/assets/icons/text-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { PaperclipLinear } from "@/assets/icons/paperclip-icon";
import { DataSourceActions } from "./datasource-actions";

export type Item = {
	id: string;
	name: string;
	lastSynced: string;
	fileSize: string;
	noReferenced: number;
	status: "Synced" | "Processing" | "Failed";
	type: "File" | "Text" | "Q&A" | "Link";
};

const dummyData: Item[] = [
	{
		id: "1",
		name: "Customer_Feedback_Q1.csv",
		lastSynced: "2 days ago",
		fileSize: "1.2 MB",
		status: "Synced",
		noReferenced: 5,
		type: "File",
	},
	// {
	// 	id: "2",
	// 	name: "Refund Policy",
	// 	lastSynced: "4 months ago",
	// 	fileSize: "9.2 KB",
	// 	status: "Processing",
	// 	noReferenced: 3,
	// 	type: "Text",
	// },
	// {
	// 	id: "3",
	// 	name: "What does your product do?",
	// 	lastSynced: "1 week ago",
	// 	fileSize: "4.5 KB",
	// 	status: "Processing",
	// 	noReferenced: 0,
	// 	type: "Q&A",
	// },
	{
		id: "4",
		name: "https://mywebsite.com",
		lastSynced: "1 minute ago",
		fileSize: "850 KB",
		status: "Failed",
		noReferenced: 12,
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
					{row.getValue("name")}
				</div>
			);
		},

		header: "Source name",
		size: 220,
	},
	{
		accessorKey: "lastSynced",
		header: "Last synced",
		size: 120,
	},
	{
		accessorKey: "noReferenced",
		header: "# times referenced",
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
				<div
					className={cn(
						"text-xs w-max font-normal border rounded-full px-2 py-0.5 ",
						status === "Synced" &&
							"bg-green-50 text-green-500  border-green-500/20",
						status === "Processing" &&
							"bg-amber-50 text-amber-500  border-amber-500/20",
						status === "Failed" &&
							"bg-red-50 text-red-500 border-red-500/20",
					)}>
					{status}
				</div>
			);
		},
		header: "Status",
		size: 120,
	},
	{
		cell: ({ row }) => <DataSourceActions item={row.original} />,
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
