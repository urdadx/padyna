import { ChatConversationPanel } from "@/components/chat-logs/chat-conversation-panel";
import { ChatHistorySidebar } from "@/components/chat-logs/chat-history-sidebar";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/(admin)/chat-logs")({
	component: RouteComponent,
});

function RouteComponent() {
	const [selectedChatId, setSelectedChatId] = useState<string>();

	return (
		<div className="flex flex-col h-full bg-background">
			<div className="flex flex-1 overflow-hidden">
				<ChatHistorySidebar
					className="w-full max-w-sm"
					selectedId={selectedChatId}
					onSelect={setSelectedChatId}
				/>
				<ChatConversationPanel
					chatId={selectedChatId}
					className="relative flex-1 h-full flex flex-col min-h-0"
				/>
			</div>
		</div>
	);
}
