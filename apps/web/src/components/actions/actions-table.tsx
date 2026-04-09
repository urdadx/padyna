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

import { CalendlyIcon } from "@/assets/icons/calendly-icon";
import { JiraIcon } from "@/assets/icons/jira-icon";
import { cn } from "@/lib/utils";
import { SlackFill } from "@/assets/icons/slack-icon";
import { IntegrationLinear } from "@/assets/icons/integration-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination } from "@/components/datasource/table-pagination";
import { CuteIconWrapper } from "@/components/cute-icon-wrapper";
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
import Spinner from "../ui/spinner";
import { ClickUpIcon } from "@/assets/icons/clickup-icon";
import { DiscordBold } from "@/assets/icons/discord-icon";

export type ActionItem = {
	id: string;
	name: string;
	description: string;
	noUsed: number;
	status: "Active" | "Inactive";
	type: "Calendly" | "Cal" | "ClickUp" | "Discord" | "Jira" | "Slack";
};

export type ActionRow = {
	id: string;
	name: string;
	provider: "jira" | "calendly" | "slack" | "cal" | "clickup" | "discord";
	enabled: boolean;
	timesUsed: number;
	description: string;
};

function mapActionToItem(db: ActionRow): ActionItem {
	return {
		id: db.id,
		name: db.name,
		description: db.description,
		noUsed: db.timesUsed,
		status: db.enabled ? "Active" : "Inactive",
		type:
			db.provider === "calendly"
				? "Calendly"
				: db.provider === "cal"
					? "Cal"
					: db.provider === "slack"
						? "Slack"
						: db.provider === "clickup"
							? "ClickUp"
							: db.provider === "discord"
								? "Discord"
								: "Jira",
	};
}

function getActionIcon(type: ActionItem["type"]) {
	switch (type) {
		case "Calendly":
			return CalendlyIcon;
		case "Jira":
			return JiraIcon;
		case "Slack":
			return SlackFill;
		case "ClickUp":
			return ClickUpIcon;
		case "Discord":
			return DiscordBold;
		default:
			return IntegrationLinear;
	}
}

function getActionIconColor(type: ActionItem["type"]) {
	switch (type) {
		case "Calendly":
			return "#006bff";
		case "Jira":
			return "#f2c744";
		case "Slack":
			return "#36c5f0";
		case "Cal":
			return "#111827";
		case "ClickUp":
			return "#ec4c47";
		case "Discord":
			return "#5865F2";
		default:
			return "#6b7280";
	}
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
			const type = row.original.type;
			const ActionIcon = getActionIcon(type);

			return (
				<div className="font-normal flex gap-2 items-center">
					<CuteIconWrapper icon={ActionIcon} color={getActionIconColor(type)} />
					<span className="block max-w-xs truncate text-sm">
						{row.getValue("name")}
					</span>
				</div>
			);
		},

		header: "Name",
		size: 200,
	},
	{
		accessorKey: "description",
		header: "Description",
		cell: ({ row }) => (
			<span className="block max-w-xs truncate text-sm">
				{row.getValue("description")}
			</span>
		),
	},
	{
		accessorKey: "noUsed",
		header: "# times used",
		cell: ({ row }) => (
			<span className="flex w-full text-center justify-center">
				{row.getValue("noUsed")}
			</span>
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
										<Spinner size={32} />
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
