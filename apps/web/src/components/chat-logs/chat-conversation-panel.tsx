import { PreviewMessages } from "@/components/agent/preview-messages";
import { cn } from "@/lib/utils";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "./chat-container";
import { ChatHeader } from "./chat-header";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { NoConversationPlaceholder } from "./no-converation-placeholder";
import Spinner from "../ui/spinner";
import { Button } from "../ui/button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "../ai-elements/prompt-input";
import { useState } from "react";

interface ChatConversationPanelProps {
  chatId?: string;
  className?: string;
}

export const ChatConversationPanel = ({ chatId, className }: ChatConversationPanelProps) => {
  const [inputValue, setInputValue] = useState("");
  const { data: messages, isLoading } = useQuery({
    ...trpc.conversations.getMessages.queryOptions({ conversationId: chatId! }),
    enabled: !!chatId,
    refetchOnMount: true,
  });

  const { data: conversation } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: chatId! }),
    enabled: !!chatId,
  });

  if (!chatId) {
    return (
      <div
        className={cn(
          "flex h-full w-full  flex-1 items-center justify-center p-8 text-center",
          className,
        )}
      >
        <NoConversationPlaceholder />
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col h-full", className)}>
      <ChatHeader
        conversationId={chatId}
        isHighPriority={conversation?.isHighPriority ?? false}
        status={conversation?.status ?? "opened"}
      />
      <ChatContainerRoot optimize className="flex-1 min-w-0 w-full smooth-div">
        <ChatContainerContent className="px-4">
          <div className="flex w-full min-w-0 flex-col gap-4 mb-10 my-3 overflow-x-hidden">
            {isLoading ? (
              <div className="flex flex-1 min-h-100 items-center justify-center gap-2">
                <Spinner size={30} />
              </div>
            ) : messages && messages.length > 0 ? (
              <PreviewMessages
                messages={messages as any}
                chatId={chatId}
                chatbotId={messages[0]?.chatbotId}
                isReady={true}
                isStreaming={false}
                bottomComponent="source-citations"
                showVoteBlock={true}
              />
            ) : (
              <div className="flex-1 flex min-h-screen items-center justify-center">
                <h2 className="mt-2 text-pretty text-muted-foreground text-lg font-semibold">
                  No messages in this conversation
                </h2>
              </div>
            )}
          </div>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <div className="bg-background p-1.5 rounded-2xl">
          <PromptInput value={inputValue} onValueChange={setInputValue} className="w-full ">
            <PromptInputTextarea placeholder="Type your message..." />
            <PromptInputActions className="justify-end pt-2">
              <PromptInputAction tooltip={"Send message"}>
                <Button variant="default">Send</Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </ChatContainerRoot>
    </div>
  );
};
