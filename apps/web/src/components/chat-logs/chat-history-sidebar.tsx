import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { Input } from "../ui/input";
import { ChatLogItem } from "./chatlog-item";

const MOCK_CHATS = [
  {
    id: "1",
    title: "How to use the platform?",
    status: "unresolved",
    date: "2026-03-10T10:00:00Z",
  },
  {
    id: "2",
    title: "Pricing inquiry",
    status: "resolved",
    date: "2026-03-10T09:30:00Z",
  },
  {
    id: "3",
    title: "Technical issue with API",
    status: "escalated",
    date: "2026-03-10T08:15:00Z",
  },
  {
    id: "4",
    title: "Feature request: Dark mode",
    status: "resolved",
    date: "2026-03-09T15:45:00Z",
  },
];

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
  return (
    <div className={cn("flex flex-col h-full border-r bg-white", className)}>
      <div className=" px-6 pt-4">
        <h1 className="text-2xl font-semibold">Chat logs</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {MOCK_CHATS.map((chat) => (
          <ChatLogItem
            key={chat.id}
            {...chat}
            isSelected={selectedId === chat.id}
            onClick={() => onSelect(chat.id)}
          />
        ))}
      </div>
    </div>
  );
};
