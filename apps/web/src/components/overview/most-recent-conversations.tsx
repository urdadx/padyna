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
	channel: "Widget" | "Link in Bio" | "Telegram" | "WhatsApp" | string;
};

export type DBConversation = {
	id: string;
	title: string;
	channel: string;
	status: string;
	updatedAt: Date | string;
	createdAt: Date | string;
	chatbotId: string;
	organizationId: string;
	userId: string;
	visibility: string;
	metadata: Record<string, unknown> | null;
};

const channelMap: Record<string, Conversation["channel"]> = {
	widget: "Widget",
	whatsapp: "WhatsApp",
	telegram: "Telegram",
	web: "Link in Bio",
	discord: "Discord",
	slack: "Slack",
	googlechat: "Google Chat",
	linear: "Linear",
	teams: "Teams",
	instagram: "Instagram",
	messenger: "Messenger",
};

function formatDate(date: Date | string): string {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));
}

function mapConversation(dbConv: DBConversation): Conversation {
	return {
		id: dbConv.id,
		date: formatDate(dbConv.updatedAt),
		title: dbConv.title,
		status:
			dbConv.status === "escalated"
				? "Escalated"
				: dbConv.status === "resolved"
					? "Resolved"
					: "Unresolved",
		channel: channelMap[dbConv.channel] ?? dbConv.channel,
	};
}

const columns: ColumnDef<Conversation>[] = [
	{
		accessorKey: "date",
		header: "Date & Time",
		cell: ({ row }) => <span className="text-xs md:text-sm">{row.getValue("date")}</span>,
	},
	{
		accessorKey: "title",
		cell: ({ row }) => (
			<span className="font-medium truncate capitalize max-w-24 md:max-w-52 block">
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

interface MostRecentConversationsProps {
	conversations: DBConversation[];
}

export function MostRecentConversations({ conversations }: MostRecentConversationsProps) {
	const mappedConversations = conversations.map(mapConversation);

	const table = useReactTable({
		columns,
		data: mappedConversations,
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
						{table.getRowModel().rows.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="text-center py-4">
									No conversations yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
