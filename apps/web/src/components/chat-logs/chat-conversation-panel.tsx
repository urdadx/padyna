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
import { SupportMessage } from "../agent/agent-components/message";
import { StatusIndicator } from "../agent/agent-components/status-indicator";
import { useRouteContext } from "@tanstack/react-router";

interface ChatConversationPanelProps {
  chatId?: string;
  className?: string;
}

type ChatComposerProps = {
  isEscalated: boolean;
  canSendMessage: boolean;
  hasJoined: boolean;
  isAssignedToOther: boolean;
  sendMessage: (text: string) => boolean | Promise<boolean>;
  sendTyping?: (isTyping: boolean) => boolean;
  placeholder?: string;
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
  canSendMessage,
  hasJoined,
  isAssignedToOther,
  sendMessage,
  sendTyping,
  placeholder,
}: ChatComposerProps) {
  const [inputValue, setInputValue] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);

  const inputDisabled = isEscalated ? !canSendMessage || isAssignedToOther : true;

  const inputPlaceholder =
    placeholder ??
    (isEscalated
      ? canSendMessage
      ? "Type your message..."
      : "Waiting for both sides to join live chat..."
      : "Escalate this chat to enable live messaging");

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (typingSentRef.current && sendTyping) {
      sendTyping(false);
      typingSentRef.current = false;
    }
  }, [sendTyping]);

  useEffect(() => {
    if (!isEscalated || !hasJoined || !canSendMessage || isAssignedToOther || !sendTyping) {
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (typingSentRef.current) {
        sendTyping(false);
        typingSentRef.current = false;
      }
      typingTimeoutRef.current = null;
    }, 1_200);
  }, [
    inputValue,
    isEscalated,
    hasJoined,
    canSendMessage,
    isAssignedToOther,
    sendTyping,
    stopTyping,
  ]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const submitMessage = useCallback(async () => {
    const next = inputValue.trim();
    if (!next || !isEscalated || !canSendMessage || isAssignedToOther) {
      return;
    }

    const sent = await Promise.resolve(sendMessage(next));
    if (!sent) {
      return;
    }

    setInputValue("");
    stopTyping();
  }, [inputValue, isEscalated, canSendMessage, isAssignedToOther, sendMessage, stopTyping]);

  return (
    <div className="bg-background p-1.5 rounded-2xl">
      <PromptInput
        value={inputValue}
        onValueChange={setInputValue}
        onSubmit={submitMessage}
        className="w-full "
        disabled={inputDisabled}
      >
        <PromptInputTextarea placeholder={inputPlaceholder} disabled={inputDisabled} />
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

function NativeHandoffHeader({
  sourceLabel,
  isAssignedToOther,
  assignedUserName,
}: {
  sourceLabel?: string;
  isAssignedToOther: boolean;
  assignedUserName?: string;
}) {
  return (
    <div className="border-b flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-950">
      <div className="flex items-center gap-2 text-sm">
        <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="font-medium text-blue-700 dark:text-blue-300">
          Human handoff active in {sourceLabel ?? "Discord"}. Replies here are sent to the customer.
        </span>
      </div>
      {isAssignedToOther ? (
        <span className="text-xs text-muted-foreground italic">Assigned to {assignedUserName}</span>
      ) : null}
    </div>
  );
}

export const ChatConversationPanel = ({ chatId, className }: ChatConversationPanelProps) => {
  const [socketMessages, setSocketMessages] = useState<any[]>([]);
  const lastListInvalidateAtRef = useRef(0);

  const { session } = useRouteContext({ from: "/(admin)" });
  const currentUserId = session?.user?.id;

  const { data: conversation } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: chatId! }),
    enabled: !!chatId,
  });

  const isEscalated = conversation?.status === "escalated" || conversation?.status === "assigned";
  const isNativeDiscordHandoff = conversation?.channel === "discord" && isEscalated;

  const { data: messages, isLoading } = useQuery({
    ...trpc.conversations.getMessages.queryOptions({ conversationId: chatId! }),
    enabled: !!chatId,
    refetchOnMount: true,
  });

  const { data: organizationMembers } = useQuery({
    ...trpc.organization.getMembers.queryOptions(),
    enabled: !!chatId,
  });

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

  const nativeDiscordReplyMutation = useMutation({
    ...trpc.conversations.sendEscalatedReply.mutationOptions(),
    onSuccess: (result) => {
      if (!chatId) {
        return;
      }

      setSocketMessages((prev) => {
        if (prev.some((msg) => msg.id === result.message.id)) {
          return prev;
        }

        return [...prev, toUiMessage(result.message)];
      });

      invalidateConversationCaches(chatId, { includeMessages: true });
    },
  });

  const liveChat = useLiveChatSocket({
    conversationId: chatId,
    role: "agent",
    enabled: Boolean(chatId) && (!isNativeDiscordHandoff || !isAssignedToOther),
    autoJoin: isNativeDiscordHandoff && !isAssignedToOther,
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

      if (chatId && !isNativeDiscordHandoff) {
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

  useEffect(() => {
    setSocketMessages([]);
  }, [chatId]);

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
  const canSendMessage = isEscalated
    ? isNativeDiscordHandoff
      ? liveChat.canSendMessages && !blockedByAssignment
      : liveChat.canSendMessages && !blockedByAssignment
    : false;

  const sendNativeDiscordMessage = useCallback(
    async (text: string) => {
      if (!chatId) {
        return false;
      }

      try {
        await nativeDiscordReplyMutation.mutateAsync({
          id: chatId,
          text,
        });
        return true;
      } catch {
        return false;
      }
    },
    [chatId, nativeDiscordReplyMutation],
  );

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
      {isEscalated && isNativeDiscordHandoff ? (
        <NativeHandoffHeader
          sourceLabel={typeof conversation?.metadata === "object" ? (conversation.metadata as any)?.sourceLabel : undefined}
          isAssignedToOther={blockedByAssignment}
          assignedUserName={assignedUserName}
        />
      ) : null}
      {isEscalated && !isNativeDiscordHandoff ? (
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
            {isEscalated && liveChat.remoteTyping && (
              <SupportMessage className="text-white" isUser={false} animate={false}>
                <StatusIndicator label="User is typing..." />
              </SupportMessage>
            )}
          </div>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <ChatComposer
          isEscalated={isEscalated}
          canSendMessage={canSendMessage}
          hasJoined={liveChat.hasJoined}
          isAssignedToOther={blockedByAssignment}
          sendMessage={isNativeDiscordHandoff ? sendNativeDiscordMessage : liveChat.sendMessage}
          sendTyping={isNativeDiscordHandoff ? undefined : liveChat.sendTyping}
          placeholder={isNativeDiscordHandoff ? "Reply in Discord thread..." : undefined}
        />
      </ChatContainerRoot>
    </div>
  );
};
