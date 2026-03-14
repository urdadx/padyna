import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
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
		date: "Oct, 11, 2024 14:30",
		title: "Pricing inquiry about Pro plan",
		status: "Resolved",
		channel: "Widget",
	},
	{
		id: "2",
		date: "Oct, 10, 2024 13:15",
		title: "Technical issue with API key",
		status: "Escalated",
		channel: "Telegram",
	},
	{
		id: "3",
		date: "Oct, 10, 2024 12:00",
		title: "Feature request for dark mode",
		status: "Unresolved",
		channel: "Link in Bio",
	},
	{
		id: "4",
		date: "Dec, 10, 2024 10:45",
		title: "General feedback - very helpful!",
		status: "Resolved",
		channel: "Widget",
	},
];

const columns: ColumnDef<Conversation>[] = [
	{
		accessorKey: "date",
		header: "Date & Time",
		cell: ({ row }) => <span className="text-xs md:text-sm">{row.getValue("date")}</span>,
	},
	{
		accessorKey: "title",
		cell: ({ row }) => (
			<span className="font-medium truncate max-w-24 md:max-w-52 block">
				{row.getValue("title")}
			</span>
		),
		header: "Title",
	},

	{
		accessorKey: "channel",
		header: "Channel",
		cell: ({ row }) => <span className="">{row.getValue("channel")}</span>,
	},
	{
		id: "actions",
		header: "Action",
		cell: () => (
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>View details</DropdownMenuItem>
					<DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
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
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground cursor-pointer">
						View all
						<ArrowUpRight className="h-3 w-3" />
					</Button>
				</Link>
			</div>
			<div className="rounded-xl border bg-background overflow-x-auto">
				<Table className="">
					<TableHeader className="bg-gray-50">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="hover:bg-transparent">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="h-10 text-sm  text-muted-foreground ">
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
										className="py-3 px-2 md:px-4 h-14">
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
