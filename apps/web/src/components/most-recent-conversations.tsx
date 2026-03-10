import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

export type Conversation = {
	id: string;
	date: string;
	title: string;
	status: "Escalated" | "Unresolved" | "Resolved";
	channel: "Widget" | "Link in Bio" | "Telegram" | "WhatsApp";
};

const dummyConversations: Conversation[] = [
	{
		id: "1",
		date: "2024-03-10 14:30",
		title: "Pricing inquiry about Pro plan",
		status: "Resolved",
		channel: "Widget",
	},
	{
		id: "2",
		date: "2024-03-10 13:15",
		title: "Technical issue with API key",
		status: "Escalated",
		channel: "Telegram",
	},
	{
		id: "3",
		date: "2024-03-10 12:00",
		title: "Feature request for dark mode",
		status: "Unresolved",
		channel: "Link in Bio",
	},
	{
		id: "4",
		date: "2024-03-10 10:45",
		title: "General feedback - very helpful!",
		status: "Resolved",
		channel: "Widget",
	},
];

const columns: ColumnDef<Conversation>[] = [
	{
		accessorKey: "date",
		header: "Date",
		size: 150,
	},
	{
		accessorKey: "title",
		cell: ({ row }) => (
			<span className="font-medium truncate max-w-52 block">
				{row.getValue("title")}
			</span>
		),
		header: "Title",
	},
	{
		accessorKey: "status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<div
					className={cn(
						"text-xs w-max font-normal border rounded-full px-2 py-0.5 ",
						status === "Resolved" &&
							"bg-green-50 text-green-500 border-green-500/20",
						status === "Unresolved" &&
							"bg-amber-50 text-amber-500 border-amber-500/20",
						status === "Escalated" &&
							"bg-blue-50 text-blue-500 border-blue-500/20",
					)}>
					{status}
				</div>
			);
		},
		header: "Status",
		size: 120,
	},
	{
		accessorKey: "channel",
		header: "Channel",
		size: 120,
	},
	{
		id: "actions",
		cell: () => (
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>View details</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
		header: "Actions",
		size: 80,
	},
];

export function MostRecentConversations() {
	const table = useReactTable({
		columns,
		data: dummyConversations,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="space-y-4 w-full">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Most recent conversations</h2>
				<Link to="/chat-logs">
					<Button variant="link" size="sm" className="text-muted-foreground">
						View all
					</Button>
				</Link>
			</div>
			<div className="rounded-xl border bg-background overflow-hidden">
				<Table>
					<TableHeader className="bg-gray-50">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="hover:bg-transparent">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{
											width:
												header.getSize() !== 150
													? header.getSize()
													: undefined,
										}}
										className="h-10 text-xs uppercase text-muted-foreground font-semibold">
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										className="py-3 px-4 h-14">
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext(),
										)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
