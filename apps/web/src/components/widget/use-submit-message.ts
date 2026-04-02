import { useCallback } from "react";
import type { useLiveChatSocket } from "@/lib/chat/live-chat-socket";

type UseSubmitMessageOptions = {
  chatId: string | undefined;
  isEscalated: boolean;
  isStreaming: boolean;
  liveChat: ReturnType<typeof useLiveChatSocket>;
  chatStartedRef: React.RefObject<boolean>;
  sendMessage: (opts: { text: string }) => Promise<void>;
  track: (
    event: "chat_started" | "chat_message",
    extra?: { conversationId?: string },
  ) => Promise<void>;
  setInput: (value: string) => void;
};

export function useSubmitMessage({
  chatId,
  isEscalated,
  isStreaming,
  liveChat,
  chatStartedRef,
  sendMessage,
  track,
  setInput,
}: UseSubmitMessageOptions) {
  const submitLiveChatMessage = useCallback(
    (text: string): boolean => {
      if (!liveChat.canSendMessages) return false;

      const sent = liveChat.sendMessage(text);
      if (!sent) return false;

      setInput("");
      liveChat.sendTyping(false);
      return true;
    },
    [liveChat, setInput],
  );

  const submitAiMessage = useCallback(
    async (text: string) => {
      setInput("");

      if (!chatStartedRef.current) {
        chatStartedRef.current = true;
        void track("chat_started", { conversationId: chatId });
      }

      void track("chat_message", { conversationId: chatId });
      await sendMessage({ text });
    },
    [chatId, chatStartedRef, sendMessage, track, setInput],
  );

  const submit = useCallback(
    async (text: string) => {
      const next = text.trim();
      if (!next) return;

      if (isEscalated) {
        submitLiveChatMessage(next);
        return;
      }

      if (isStreaming) return;

      await submitAiMessage(next);
    },
    [isEscalated, isStreaming, submitLiveChatMessage, submitAiMessage],
  );

  return { submit };
}
