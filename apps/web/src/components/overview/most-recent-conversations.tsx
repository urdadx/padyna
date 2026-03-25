import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc, trpcClient } from "@/utils/trpc";
import Spinner from "@/components/ui/spinner";

// ---- Types ----

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

// ---- Helpers ----

const CHANNEL_MAP: Record<string, string> = {
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
		channel: CHANNEL_MAP[dbConv.channel] ?? dbConv.channel,
	};
}

// ---- Delete Dialog ----

function DeleteConversationDialog({
	id,
	open,
	onOpenChange,
	onDeleted,
}: {
	id: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: () => void;
}) {
	const queryClient = useQueryClient();

	const { mutate, isPending } = useMutation({
		mutationFn: () => trpcClient.conversations.delete.mutate({ id }),
		onSuccess: () => {
			toast.success("Conversation deleted");
			onOpenChange(false);
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getRecent.queryOptions({ limit: 5 }).queryKey,
			});
			onDeleted?.();
		},
		onError: () => {
			toast.error("Failed to delete conversation. Please try again.");
		},
	});

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="p-5">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-lg font-semibold">
						Are you absolutely sure?
					</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the
						conversation and remove the data from our servers.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							mutate();
						}}
						disabled={isPending}
						className="bg-red-600 hover:bg-red-700 text-white">
						{isPending ? (
							<>
								<Spinner color="white" />
								Deleting...
							</>
						) : (
							"Yes, delete"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
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
				<span className="font-medium truncate capitalize max-w-24 md:max-w-52 block text-xs md:text-sm">
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
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>
							<Link to="/chat-logs">View details</Link>
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
		<div className="rounded-xl border bg-background overflow-x-auto">
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

			<ConversationsTable conversations={mapped} onDelete={setDeleteId} />

			<DeleteConversationDialog
				id={deleteId ?? ""}
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
				onDeleted={onConversationDeleted}
			/>
		</div>
	);
}
