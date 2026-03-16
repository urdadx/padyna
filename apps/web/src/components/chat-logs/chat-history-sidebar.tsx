import { cn } from "@/lib/utils";
import { ChatLogItem } from "./chatlog-item";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "../ui/button";
import { SolarFilterBoldDuotone } from "@/assets/icons/filter-icon";

interface ChatHistorySidebarProps {
	selectedId?: string;
	onSelect: (id: string) => void;
	className?: string;
}

export const ChatHistorySidebar = ({
	selectedId,
	onSelect,
	className,
}: ChatHistorySidebarProps) => {
	const { data: conversations } = useSuspenseQuery(trpc.conversations.getAll.queryOptions());

	return (
		<div className={cn("flex flex-col h-full rounded-xl border bg-white", className)}>
			<div className=" px-6 pt-4 flex justify-between items-center">
				<h1 className="text-2xl font-semibold">Chat logs</h1>
				<Button variant="outline">
					<SolarFilterBoldDuotone />
					Filter
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto p-2">
				{conversations && conversations.length > 0 ? (
					conversations.map((conversation) => (
						<ChatLogItem
							key={conversation.id}
							id={conversation.id}
							title={`Conversation ${conversation.id.slice(0, 8)}`}
							status="unresolved"
							date={conversation.updatedAt.toString()}
							isSelected={selectedId === conversation.id}
							onClick={() => onSelect(conversation.id)}
						/>
					))
				) : (
					<div className="p-4 text-center text-muted-foreground">
						No conversations yet
					</div>
				)}
			</div>
		</div>
	);
};
