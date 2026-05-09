import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

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
import { DeleteChat } from "../chat-logs/delete-chat";

export type DBConversation = {
	id: string;
	title: string;
	channel: string;
	status: string;
	updatedAt: Date | string;
	createdAt: Date | string;
	chatbotId: string;
	organizationId: string;
	userId: string | null;
	visibility: string;
	metadata: Record<string, unknown> | null;
};

type Conversation = {
	id: string;
	date: string;
	title: string;
	status: "Escalated" | "Unresolved" | "Resolved";
	channel: string;
};

const CHANNEL_MAP: Record<string, string> = {
	widget: "Widget",
	whatsapp: "WhatsApp",
	telegram: "Telegram",
	web: "Website",
	discord: "Discord",
	slack: "Slack",
	googlechat: "Google Chat",
	linear: "Linear",
	teams: "Teams",
	instagram: "Instagram",
	messenger: "Messenger",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

function formatDate(date: Date | string): string {
	return DATE_TIME_FORMATTER.format(new Date(date));
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
		channel: CHANNEL_MAP[dbConv.channel] ?? dbConv.channel,
	};
}

function ConversationsTable({
	conversations,
	onDelete,
}: {
	conversations: Conversation[];
	onDelete: (id: string) => void;
}) {
	const columns: ColumnDef<Conversation>[] = [
		{
			accessorKey: "date",
			header: "Date & Time",
			cell: ({ row }) => (
				<span className="font-medium truncate capitalize max-w-24 md:max-w-52 block">
					{row.getValue("date")}
				</span>
			),
		},
		{
			accessorKey: "title",
			header: "Title",
			cell: ({ row }) => (
				<span className="font-medium truncate capitalize max-w-24 md:max-w-52 block">
					{row.getValue("title")}
				</span>
			),
		},
		{
			accessorKey: "channel",
			header: "Channel",
			cell: ({ row }) => <span>{row.getValue("channel")}</span>,
		},
		{
			id: "actions",
			header: "Action",
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="outline" className="h-8 w-8 p-0">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>
							<Link to={`/chat-logs?chatId=${row.original.id}`}>
								View details
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.preventDefault();
								onDelete(row.original.id);
							}}>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	const table = useReactTable({
		columns,
		data: conversations,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="rounded-xl max-w-sm md:max-w-full border bg-background overflow-hidden">
			<Table>
				<TableHeader className="bg-gray-50">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="hover:bg-transparent">
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className="h-10 text-sm text-muted-foreground">
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
					{table.getRowModel().rows.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="text-center py-4">
								No conversations yet.
							</TableCell>
						</TableRow>
					) : (
						table.getRowModel().rows.map((row) => (
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
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

interface MostRecentConversationsProps {
	conversations: DBConversation[];
	onConversationDeleted?: () => void;
}

export function MostRecentConversations({
	conversations,
	onConversationDeleted,
}: MostRecentConversationsProps) {
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const mapped = conversations.map(mapConversation);

	return (
		<div className="space-y-4 w-full">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Recent conversations</h2>
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

			<ConversationsTable conversations={mapped} onDelete={setDeleteId} />

			<DeleteChat
				id={deleteId ?? ""}
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
				onDeleted={onConversationDeleted}
			/>
		</div>
	);
}
