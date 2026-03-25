import { cn } from "@/lib/utils";
import { ChatLogItem } from "./chatlog-item";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "../ui/button";
import { InboxUnread } from "@/assets/icons/inbox-unread";

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

  return (
    <div className={cn("flex flex-col h-full rounded-xl border bg-white", className)}>
      <div className="px-4 pt-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">All messages</h1>
        <div className="flex gap-2 items-center">
          <Button variant="outline">All</Button>
          <Button variant="outline">Recent</Button>
        </div>
      </div>
      <div className="flex-1 smooth-div p-2">
        {conversations && conversations.length > 0 ? (
          conversations.map((conversation) => (
            <ChatLogItem
              key={conversation.id}
              id={conversation.id}
              title={conversation.title}
              status="unresolved"
              date={conversation.updatedAt.toString()}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation.id)}
              onDeleted={onDeleted}
            />
          ))
        ) : (
          <div className="h-full flex flex-col gap-2 justify-center items-center">
            <InboxUnread color="#888888" className="h-10 w-10 text-muted-foreground" />
            <div className="text-muted-foreground text-sm">New messages will appear here</div>
          </div>
        )}
      </div>
    </div>
  );
};
