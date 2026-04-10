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
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

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
import { CreateActionDialog } from "./create-action-dialog";
import Spinner from "../ui/spinner";
import { ClickUpIcon } from "@/assets/icons/clickup-icon";
import { DiscordBold } from "@/assets/icons/discord-icon";
import { ActionsMultiSelectToolbar } from "./actions-multi-select-toolbar";
import api from "@/lib/api";
import { queryClient } from "@/utils/trpc";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";

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
	onDeleteSelected?: (selected: ActionItem[]) => void;
	onToggleEnabledSelected?: (selected: ActionItem[], nextStatus: ActionItem["status"]) => void;
	onEditSelected?: (selected: ActionItem) => void;
};

export function ActionsTable({
	data,
	isLoading,
	onDeleteSelected,
	onToggleEnabledSelected,
	onEditSelected,
}: ActionsTableProps) {
	const navigate = useNavigate();
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
	const [deleteOpen, setDeleteOpen] = useState(false);

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
	const selectedItems = selectedRows.map((row) => row.original);
	const isAnySelected = selectedRows.length > 0;
	const isSingleSelection = selectedRows.length === 1;
	const isAllSelected = table.getIsAllPageRowsSelected();
	const shouldDisableSelected = selectedItems.every((item) => item.status === "Active");
	const nextStatusLabel: ActionItem["status"] = shouldDisableSelected ? "Inactive" : "Active";
	const enableLabel = shouldDisableSelected ? "Disable" : "Enable";
	const hasSelection = selectedItems.length > 0;

	const toggleSelectedMutation = useMutation({
		mutationFn: async () => {
			await Promise.all(
				selectedItems.map((item) =>
					api.patch(`/api/actions/${item.id}/enabled`, {
						enabled: nextStatusLabel === "Active",
					}),
				),
			);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["actions"] });
			await Promise.all(
				selectedItems.map((item) =>
					queryClient.invalidateQueries({ queryKey: ["actions", item.id] }),
				),
			);
			toast.success(
				nextStatusLabel === "Active" ? "Actions enabled" : "Actions disabled",
			);
			table.resetRowSelection();
			onToggleEnabledSelected?.(selectedItems, nextStatusLabel);
		},
		onError: (error: any) => {
			toast.error(error.response?.data?.message || "Failed to update actions");
		},
	});

	const deleteSelectedMutation = useMutation({
		mutationFn: async () => {
			await Promise.all(
				selectedItems.map((item) => api.delete(`/api/actions/${item.id}`)),
			);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["actions"] });
			toast.success(selectedItems.length === 1 ? "Action deleted" : "Actions deleted");
			setDeleteOpen(false);
			table.resetRowSelection();
			onDeleteSelected?.(selectedItems);
		},
		onError: (error: any) => {
			toast.error(error.response?.data?.message || "Failed to delete actions");
		},
	});

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
			<div className="rounded-xl border bg-background overflow-hidden max-w-sm md:max-w-full">
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
				<ActionsMultiSelectToolbar
					isAllSelected={isAllSelected}
					isSingleSelection={isSingleSelection}
					enableLabel={enableLabel}
					isToggling={toggleSelectedMutation.isPending}
					isDeleting={deleteSelectedMutation.isPending}
					onSelectAll={() => table.toggleAllPageRowsSelected(!isAllSelected)}
					onToggleEnabled={() => {
						if (!hasSelection) {
							return;
						}

						toggleSelectedMutation.mutate();
					}}
					onDelete={() => {
						if (!hasSelection) {
							return;
						}

						setDeleteOpen(true);
					}}
					onEdit={() => {
						if (!isSingleSelection) {
							return;
						}

						onEditSelected?.(selectedItems[0]);
						navigate({
							to: "/actions/$actionId/edit",
							params: { actionId: selectedItems[0].id },
						});
					}}
					onClose={() => table.resetRowSelection()}
				/>
			)}

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-lg font-semibold">
							Are you absolutely sure?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete{" "}
							{selectedItems.length === 1
								? "the selected action"
								: `${selectedItems.length} selected actions`}{" "}
							and remove all associated data.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteSelectedMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteSelectedMutation.mutate()}
							disabled={deleteSelectedMutation.isPending}
							className="bg-red-600 text-white hover:bg-red-700">
							{deleteSelectedMutation.isPending ? (
								<>
									<Spinner className="text-white" />
									Deleting...
								</>
							) : (
								"Yes, delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
