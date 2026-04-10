import { cn } from "@/lib/utils";
import { ChatLogItem } from "./chatlog-item";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "../ui/button";
import { InboxUnread } from "@/assets/icons/inbox-unread";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RestartLinear } from "@/assets/icons/restart-icon";

export type FilterOption = "all" | "escalated" | "opened" | "closed" | "assigned";
export type SortOption =
	| "recent"
	| "oldest"
	| "priority"
	| "web"
	| "whatsapp"
	| "telegram"
	| "discord"
	| "slack"
	| "instagram"
	| "messenger"
	| "googlechat"
	| "teams"
	| "linear";

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
	{ label: "All", value: "all" },
	{ label: "Opened", value: "opened" },
	{ label: "Closed", value: "closed" },
	{ label: "Escalated", value: "escalated" },
	{ label: "Assigned to me", value: "assigned" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
	{ label: "Recent", value: "recent" },
	{ label: "Oldest", value: "oldest" },
	{ label: "Highest priority", value: "priority" },
	{ label: "Widget", value: "web" },
	{ label: "WhatsApp", value: "whatsapp" },
	{ label: "Telegram", value: "telegram" },
	{ label: "Discord", value: "discord" },
	{ label: "Slack", value: "slack" },
];

interface ChatHistorySidebarProps {
	selectedId?: string;
	onSelect: (id: string) => void;
	onDeleted?: () => void;
	className?: string;
	filter: FilterOption;
	onFilterChange: (filter: FilterOption) => void;
	sort: SortOption;
	onSortChange: (sort: SortOption) => void;
}

export const ChatHistorySidebar = ({
	selectedId,
	onSelect,
	onDeleted,
	className,
	filter,
	onFilterChange,
	sort,
	onSortChange,
}: ChatHistorySidebarProps) => {
	const {
		data: conversations,
		refetch,
		isRefetching,
	} = useSuspenseQuery({
		...trpc.conversations.getAll.queryOptions({ filter, sort }),
		refetchOnMount: true,
	});

	const currentFilter = FILTER_OPTIONS.find((f) => f.value === filter);
	const currentSort = SORT_OPTIONS.find((s) => s.value === sort);

	return (
		<div className={cn("flex flex-col h-full rounded-xl border bg-white", className)}>
			<div className="px-4 pt-4 flex justify-between items-center">
				<div className="flex items-center gap-2 max-w-sm truncate">
					<h1 className="text-xl font-semibold truncate leading-none">
						All chats
					</h1>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
						onClick={() => refetch()}
						disabled={isRefetching}>
						<RestartLinear
							className={cn("h-4 w-4", isRefetching && "animate-spin")}
						/>
					</Button>
				</div>
				<div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="outline" size="sm" className="h-8">
									{currentFilter?.label}
								</Button>
							}></DropdownMenuTrigger>
						<DropdownMenuContent className="w-full max-w-50" align="end">
							<DropdownMenuRadioGroup
								value={filter}
								onValueChange={(v) =>
									onFilterChange(v as FilterOption)
								}>
								{FILTER_OPTIONS.map((option) => (
									<DropdownMenuRadioItem
										key={option.value}
										value={option.value}>
										<div
											className={cn(
												"rounded-full w-2 h-2",
												option.value === "all"
													? "bg-black"
													: option.value ===
														  "opened"
														? "bg-green-500"
														: option.value ===
															  "escalated"
															? "bg-blue-500"
															: option.value ===
																  "closed"
																? "bg-red-500"
																: option.value ===
																	  "assigned"
																	? "bg-yellow-500"
																	: "bg-gray-500",
											)}
										/>
										{option.label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="outline" size="sm" className="h-8">
									{currentSort?.label}
								</Button>
							}></DropdownMenuTrigger>
						<DropdownMenuContent className="w-full max-w-50" align="end">
							<DropdownMenuRadioGroup
								value={sort}
								onValueChange={(v) =>
									onSortChange(v as SortOption)
								}>
								{SORT_OPTIONS.map((option) => (
									<DropdownMenuRadioItem
										key={option.value}
										value={option.value}>
										{option.label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<div className="flex-1 smooth-div p-2">
				{conversations && conversations.length > 0 ? (
					conversations.map((conversation) => (
						<ChatLogItem
							key={conversation.id}
							id={conversation.id}
							title={conversation.title}
							status="closed"
							date={conversation.updatedAt.toString()}
							platform={conversation.channel}
							isSelected={selectedId === conversation.id}
							onClick={() => onSelect(conversation.id)}
							onDeleted={onDeleted}
						/>
					))
				) : (
					<div className="h-full flex flex-col gap-2 justify-center items-center">
						<InboxUnread
							color="#888888"
							className="h-10 w-10 text-muted-foreground"
						/>
						<div className="text-muted-foreground text-sm">
							New messages will appear here
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
