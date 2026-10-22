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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveChatSocket } from "@/lib/chat/live-chat-socket";
import { ChatStatusHeader } from "./chat-status-header";
import { LiveTypingIndicator } from "../agent/agent-components/live-typing-indicator";
import { useRouteContext } from "@tanstack/react-router";

interface ChatConversationPanelProps {
  chatId?: string;
  className?: string;
}

type ChatComposerProps = {
  isEscalated: boolean;
  canSendLiveMessage: boolean;
  hasJoined: boolean;
  isAssignedToOther: boolean;
  sendMessage: (text: string) => boolean;
  sendTyping: (isTyping: boolean) => boolean;
};

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

function ChatComposer({
  isEscalated,
  canSendLiveMessage,
  hasJoined,
  isAssignedToOther,
  sendMessage,
  sendTyping,
}: ChatComposerProps) {
  const [inputValue, setInputValue] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);

  const inputDisabled = isEscalated ? !canSendLiveMessage || isAssignedToOther : true;

  const placeholder = isEscalated
    ? canSendLiveMessage
      ? "Type your message..."
      : "Waiting for both sides to join live chat..."
    : "Escalate this chat to enable live messaging";

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (typingSentRef.current) {
      sendTyping(false);
      typingSentRef.current = false;
    }
  }, [sendTyping]);

  useEffect(() => {
    if (!isEscalated || !hasJoined || !canSendLiveMessage || isAssignedToOther) {
      stopTyping();
      return;
    }

    if (inputValue.trim().length === 0) {
      stopTyping();
      return;
    }

    if (!typingSentRef.current) {
      sendTyping(true);
      typingSentRef.current = true;
    }

    const timeoutId = setTimeout(() => {
      if (typingSentRef.current) {
        sendTyping(false);
        typingSentRef.current = false;
      }
    }, 1_200);
    typingTimeoutRef.current = timeoutId;

    return () => {
      clearTimeout(timeoutId);
      if (typingTimeoutRef.current === timeoutId) {
        typingTimeoutRef.current = null;
      }
      if (typingSentRef.current) {
        sendTyping(false);
        typingSentRef.current = false;
      }
    };
  }, [
    inputValue,
    isEscalated,
    hasJoined,
    canSendLiveMessage,
    isAssignedToOther,
    sendTyping,
    stopTyping,
  ]);

  const submitMessage = useCallback(async () => {
    const next = inputValue.trim();
    if (!next || !isEscalated || !canSendLiveMessage || isAssignedToOther) {
      return;
    }

    const sent = sendMessage(next);
    if (!sent) {
      return;
    }

    setInputValue("");
    stopTyping();
  }, [inputValue, isEscalated, canSendLiveMessage, isAssignedToOther, sendMessage, stopTyping]);

  return (
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
  );
}

const ChatConversationPanelContent = ({ chatId, className }: ChatConversationPanelProps) => {
  const [socketMessages, setSocketMessages] = useState<any[]>([]);
  const lastListInvalidateAtRef = useRef(0);

  const { session } = useRouteContext({ from: "/(admin)" });
  const currentUserId = session?.user?.id;

  const { data: messages, isLoading } = useQuery({
    ...trpc.conversations.getMessages.queryOptions({ conversationId: chatId! }),
    enabled: !!chatId,
    refetchOnMount: true,
  });

  const { data: conversation } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: chatId! }),
    enabled: !!chatId,
  });

  const { data: organizationMembers } = useQuery({
    ...trpc.organization.getMembers.queryOptions(),
    enabled: !!chatId,
  });

  const isEscalated = conversation?.status === "escalated" || conversation?.status === "assigned";

  const assignedUserName = useMemo(() => {
    if (!conversation?.assignedTo) {
      return undefined;
    }

    const assignedMember = organizationMembers?.find(
      (member) => member.id === conversation.assignedTo,
    );

    return assignedMember?.name ?? assignedMember?.email ?? "Another agent";
  }, [organizationMembers, conversation?.assignedTo]);

  const isAssignedToOther = Boolean(
    conversation?.assignedTo && currentUserId && conversation.assignedTo !== currentUserId,
  );

  const invalidateConversationCaches = useCallback(
    (conversationId: string, input?: { includeMessages?: boolean }) => {
      queryClient.invalidateQueries({
        queryKey: trpc.conversations.getById.queryOptions({ id: conversationId }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.conversations.getAll.queryOptions({
          filter: "all",
          sort: "recent",
        }).queryKey,
      });

      if (input?.includeMessages) {
        queryClient.invalidateQueries({
          queryKey: trpc.conversations.getMessages.queryOptions({
            conversationId,
          }).queryKey,
        });
      }
    },
    [],
  );

  const endSessionMutation = useMutation({
    ...trpc.conversations.updateStatus.mutationOptions(),
    onSuccess: () => {
      if (!chatId) {
        return;
      }

      invalidateConversationCaches(chatId, { includeMessages: true });
    },
  });

  const liveChat = useLiveChatSocket({
    conversationId: chatId,
    role: "agent",
    enabled: Boolean(chatId),
    autoJoin: false,
    onMessage: (incoming) => {
      setSocketMessages((prev) => {
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
        const now = Date.now();
        if (now - lastListInvalidateAtRef.current > 5_000) {
          lastListInvalidateAtRef.current = now;
          queryClient.invalidateQueries({
            queryKey: trpc.conversations.getAll.queryOptions({
              filter: "all",
              sort: "recent",
            }).queryKey,
          });
        }
      }
    },
    onConversationStatus: (payload) => {
      if (!chatId || payload.conversationId !== chatId) {
        return;
      }

      invalidateConversationCaches(payload.conversationId, {
        includeMessages: payload.status === "opened" || payload.status === "closed",
      });
    },
  });
  const baseMessages = useMemo(() => {
    if (!messages) {
      return [];
    }

    return messages.map(toUiMessage);
  }, [messages]);

  const liveMessages = useMemo(() => {
    if (socketMessages.length === 0) {
      return baseMessages;
    }

    const mergedById = new Map<string, any>();
    for (const message of baseMessages) {
      mergedById.set(message.id, message);
    }

    for (const message of socketMessages) {
      mergedById.set(message.id, message);
    }

    return Array.from(mergedById.values());
  }, [baseMessages, socketMessages]);

  const blockedByAssignment = liveChat.isAssignedToOther || isAssignedToOther;
  const canSendLiveMessage = isEscalated ? liveChat.canSendMessages && !blockedByAssignment : false;

  const chatbotId = useMemo(() => {
    if (liveMessages.length === 0) {
      return undefined;
    }

    return liveMessages.find((message) => Boolean(message.chatbotId))?.chatbotId;
  }, [liveMessages]);

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
        assignedToUserId={conversation?.assignedTo}
        conversation={conversation}
        assignedUserName={assignedUserName}
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
          isAssignedToOther={blockedByAssignment}
          assignedUserName={assignedUserName}
        />
      ) : null}
      <ChatContainerRoot optimize className="flex-1 min-w-0 w-full smooth-div">
        <ChatContainerContent className="px-4">
          <div className="relative flex w-full min-w-0 flex-col gap-4 mt-3 pb-12 overflow-x-hidden">
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
                showToolCalls={true}
                showActionForms={false}
              />
            ) : (
              <div className="flex-1 flex min-h-screen items-center justify-center">
                <h2 className="mt-2 text-pretty text-muted-foreground text-lg font-semibold">
                  No messages in this conversation
                </h2>
              </div>
            )}
            {/* Sits in the list's bottom padding, so it never shifts the messages. */}
            {isEscalated && (
              <LiveTypingIndicator
                visible={liveChat.remoteTyping}
                label="User is typing..."
                className="absolute bottom-2 left-0"
              />
            )}
          </div>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <ChatComposer
          isEscalated={isEscalated}
          canSendLiveMessage={canSendLiveMessage}
          hasJoined={liveChat.hasJoined}
          isAssignedToOther={blockedByAssignment}
          sendMessage={liveChat.sendMessage}
          sendTyping={liveChat.sendTyping}
        />
      </ChatContainerRoot>
    </div>
  );
};

export const ChatConversationPanel = ({ chatId, className }: ChatConversationPanelProps) => {
  return <ChatConversationPanelContent key={chatId ?? "no-chat"} chatId={chatId} className={className} />;
};
