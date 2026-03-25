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
    <div className="flex flex-col h-full w-full min-w-0 bg-gray-50/40 p-1.5">
      <div className="flex flex-1 overflow-hidden min-w-0 gap-1">
        <ChatHistorySidebar
          className="w-full max-w-sm"
          selectedId={selectedChatId}
          onSelect={setSelectedChatId}
          onDeleted={() => setSelectedChatId(undefined)}
        />
        <ChatConversationPanel
          chatId={selectedChatId}
          className="relative flex-1 h-full min-w-0 bg-white border rounded-xl flex flex-col min-h-0"
        />
      </div>
    </div>
  );
}
