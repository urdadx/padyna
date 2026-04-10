import { ChatConversationPanel } from "@/components/chat-logs/chat-conversation-panel";
import { ChatHistorySidebar } from "@/components/chat-logs/chat-history-sidebar";
import { DrawerConversations } from "@/components/chat-logs/drawer-conversations";
import { useIsMobile } from "@/hooks/use-mobile";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

type FilterOption = "all" | "escalated" | "opened" | "closed" | "assigned";
type SortOption =
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

export const Route = createFileRoute("/(admin)/chat-logs")({
	component: RouteComponent,
	validateSearch: (search) =>
		z
			.object({
				chatId: z.string().optional(),
				filter: z
					.enum(["all", "escalated", "opened", "closed", "assigned"])
					.default("all"),
				sort: z
					.enum([
						"recent",
						"oldest",
						"priority",
						"web",
						"whatsapp",
						"telegram",
						"discord",
						"slack",
						"instagram",
						"messenger",
						"googlechat",
						"teams",
						"linear",
					])
					.default("recent"),
			})
			.parse(search),
});

function RouteComponent() {
	const { chatId, filter, sort } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const isMobile = useIsMobile();

	const setSelectedChatId = (id?: string) => {
		navigate({
			search: (prev: Record<string, any>) => ({
				...prev,
				chatId: id,
			}),
		});
	};

	const setFilter = (newFilter: FilterOption) => {
		navigate({
			search: (prev: Record<string, any>) => ({
				...prev,
				filter: newFilter,
			}),
		});
	};

	const setSort = (newSort: SortOption) => {
		navigate({
			search: (prev: Record<string, any>) => ({
				...prev,
				sort: newSort,
			}),
		});
	};

	return (
		<div className="flex flex-col h-full w-full min-w-0 bg-gray-50/40 p-1.5">
			<div className="flex flex-1 overflow-hidden min-w-0 gap-1">
				<ChatHistorySidebar
					className="w-full lg:max-w-sm"
					selectedId={chatId}
					onSelect={setSelectedChatId}
					onDeleted={() => setSelectedChatId(undefined)}
					filter={filter ?? "all"}
					onFilterChange={setFilter}
					sort={sort ?? "recent"}
					onSortChange={setSort}
				/>
				<ChatConversationPanel
					chatId={chatId}
					className="hidden lg:flex relative flex-1 h-full min-w-0 bg-white border rounded-xl flex-col min-h-0"
				/>
			</div>
			{isMobile && (
				<DrawerConversations
					chatId={chatId}
					onClose={() => setSelectedChatId(undefined)}
				/>
			)}
		</div>
	);
}
