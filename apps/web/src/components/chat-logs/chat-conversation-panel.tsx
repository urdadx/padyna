import { PreviewMessages } from "@/components/agent/preview-messages";
import { cn } from "@/lib/utils";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "./chat-container";
import { ChatHeader } from "./chat-header";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { queryClient } from "@/utils/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveChatSocket } from "@/lib/chat/live-chat-socket";
import { ChatStatusHeader } from "./chat-status-header";
import { TypingIndicator } from "./typing-indicator";

interface ChatConversationPanelProps {
  chatId?: string;
  className?: string;
}

function toUiMessage(message: any) {
  const fallbackText = typeof message?.contentText === "string" ? message.contentText : "";
  const parts =
    Array.isArray(message?.parts) && message.parts.length > 0
      ? message.parts
      : [{ type: "text", text: fallbackText }];

  return {
    id: message?.messageId ?? message?.id,
    role: message?.role,
    parts,
    contentText: fallbackText,
    chatbotId: message?.chatbotId,
  };
}

export const ChatConversationPanel = ({ chatId, className }: ChatConversationPanelProps) => {
  const [inputValue, setInputValue] = useState("");
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: messages, isLoading } = useQuery({
    ...trpc.conversations.getMessages.queryOptions({ conversationId: chatId! }),
    enabled: !!chatId,
    refetchOnMount: true,
  });

  const { data: conversation } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: chatId! }),
    enabled: !!chatId,
  });

  const isEscalated = conversation?.status === "escalated" || conversation?.status === "assigned";

  const endSessionMutation = useMutation({
    ...trpc.conversations.updateStatus.mutationOptions(),
    onSuccess: () => {
      if (!chatId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: trpc.conversations.getById.queryOptions({ id: chatId }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.conversations.getAll.queryOptions({ filter: "all", sort: "recent" }).queryKey,
      });
    },
  });

  const liveChat = useLiveChatSocket({
    conversationId: chatId,
    role: "agent",
    enabled: Boolean(chatId),
    autoJoin: false,
    onMessage: (incoming) => {
      setLiveMessages((prev) => {
        if (prev.some((msg) => msg.id === incoming.id)) {
          return prev;
        }

        return [
          ...prev,
          {
            id: incoming.id,
            role: incoming.role,
            parts: [{ type: "text", text: incoming.text }],
            contentText: incoming.text,
          },
        ];
      });

      if (chatId) {
        queryClient.invalidateQueries({
          queryKey: trpc.conversations.getMessages.queryOptions({ conversationId: chatId }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.conversations.getAll.queryOptions({ filter: "all", sort: "recent" }).queryKey,
        });
      }
    },
    onConversationStatus: (payload) => {
      if (!chatId || payload.conversationId !== chatId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: trpc.conversations.getById.queryOptions({ id: payload.conversationId }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.conversations.getAll.queryOptions({ filter: "all", sort: "recent" }).queryKey,
      });
    },
  });

  useEffect(() => {
    if (!messages) {
      setLiveMessages([]);
      return;
    }

    setLiveMessages(messages.map(toUiMessage));
  }, [messages]);

  useEffect(() => {
    if (!isEscalated || !liveChat.hasJoined) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (inputValue.trim().length === 0) {
      liveChat.sendTyping(false);
      return;
    }

    liveChat.sendTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      liveChat.sendTyping(false);
      typingTimeoutRef.current = null;
    }, 1_200);
  }, [inputValue, isEscalated, liveChat]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const canSendLiveMessage = isEscalated ? liveChat.canSendMessages && !liveChat.isAssignedToOther : false;

  const inputDisabled = isEscalated ? !canSendLiveMessage : true;

  const placeholder = isEscalated
    ? canSendLiveMessage
      ? "Type your message..."
      : "Waiting for both sides to join live chat..."
    : "Escalate this chat to enable live messaging";

  const chatbotId = useMemo(() => {
    if (liveMessages.length === 0) {
      return undefined;
    }

    return liveMessages.find((message) => Boolean(message.chatbotId))?.chatbotId;
  }, [liveMessages]);

  const submitMessage = async () => {
    const next = inputValue.trim();
    if (!next || !isEscalated) {
      return;
    }

    if (!canSendLiveMessage) {
      return;
    }

    const sent = liveChat.sendMessage(next);
    if (!sent) {
      return;
    }

    setInputValue("");
    liveChat.sendTyping(false);
  };

  const handleEndSession = () => {
    if (!chatId || endSessionMutation.isPending) {
      return;
    }

    liveChat.disconnect();
    endSessionMutation.mutate({
      id: chatId,
      status: "closed",
    });
  };

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
      {isEscalated ? (
        <ChatStatusHeader
          status={liveChat.status}
          hasJoined={liveChat.hasJoined}
          isPeerJoined={liveChat.isPeerJoined}
          isConnected={liveChat.isConnected}
          onConnect={liveChat.connect}
          onJoin={liveChat.join}
          onEndSession={handleEndSession}
          isAssignedToOther={liveChat.isAssignedToOther}
        />
      ) : null}
      <ChatContainerRoot optimize className="flex-1 min-w-0 w-full smooth-div">
        <ChatContainerContent className="px-4">
          <div className="flex w-full min-w-0 flex-col gap-4 mb-10 my-3 overflow-x-hidden">
            {isLoading ? (
              <div className="flex flex-1 min-h-100 items-center justify-center gap-2">
                <Spinner size={30} />
              </div>
            ) : liveMessages.length > 0 ? (
              <PreviewMessages
                messages={liveMessages as any}
                chatId={chatId}
                chatbotId={chatbotId}
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
            {isEscalated && liveChat.remoteTyping && <TypingIndicator label="User is typing..." />}
          </div>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <div className="bg-background p-1.5 rounded-2xl">
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={submitMessage}
            className="w-full "
            disabled={inputDisabled}
          >
            <PromptInputTextarea placeholder={placeholder} disabled={inputDisabled} />
            <PromptInputActions className="justify-end pt-2">
              <PromptInputAction tooltip={"Send message"}>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    void submitMessage();
                  }}
                  disabled={inputDisabled || !inputValue.trim()}
                >
                  Send
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </ChatContainerRoot>
    </div>
  );
};
