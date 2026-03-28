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
import * as React from "react";

type FilterOption = "all" | "escalated" | "opened" | "closed" | "assigned";

type SortOption = "recent" | "oldest" | "priority";

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
];

interface ChatHistorySidebarProps {
	selectedId?: string;
	onSelect: (id: string) => void;
	onDeleted?: () => void;
	className?: string;
}

export const ChatHistorySidebar = ({
	selectedId,
	onSelect,
	onDeleted,
	className,
}: ChatHistorySidebarProps) => {
	const { data: conversations } = useSuspenseQuery(trpc.conversations.getAll.queryOptions());
	const [filter, setFilter] = React.useState<FilterOption>("all");
	const [sort, setSort] = React.useState<SortOption>("recent");

	const currentFilter = FILTER_OPTIONS.find((f) => f.value === filter);
	const currentSort = SORT_OPTIONS.find((s) => s.value === sort);

	return (
		<div className={cn("flex flex-col h-full rounded-xl border bg-white", className)}>
			<div className="px-4 pt-4 flex justify-between items-center">
				<h1 className="text-xl font-semibold max-w-sm truncate">All chats</h1>
				<div className="flex gap-2 items-center">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="outline">
									{currentFilter?.label}
								</Button>
							}></DropdownMenuTrigger>
						<DropdownMenuContent className="w-full max-w-md" align="end">
							<DropdownMenuRadioGroup
								value={filter}
								onValueChange={(v) => setFilter(v as FilterOption)}>
								{FILTER_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}>
                    <div
                      className={cn(
                        "rounded-full w-2 h-2",
                        option.value === "all"
                          ? "bg-black"
                          : option.value === "opened"
                          ? "bg-green-500"
                          : option.value === "escalated"
                          ? "bg-blue-500"
                          : option.value === "closed"
                          ? "bg-red-500"
                          : option.value === "assigned"
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
								<Button variant="outline">
									{currentSort?.label}
								</Button>
							}></DropdownMenuTrigger>
						<DropdownMenuContent className="w-full max-w-md" align="end">
							<DropdownMenuRadioGroup
								value={sort}
								onValueChange={(v) => setSort(v as SortOption)}>
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
