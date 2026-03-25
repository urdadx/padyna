import {
  type UIMessage,
  type UseChatHelpers,
  type UseChatOptions,
  useChat as useOriginalChat,
} from "@ai-sdk/react";
import { useCallback, useEffect, useRef } from "react";
import { type StoreState, useChatStoreApi } from "./hooks";

export type { UseChatOptions, UseChatHelpers };

export interface CompatibleChatStore<TMessage extends UIMessage = UIMessage> {
  <T>(selector: (state: StoreState<TMessage>) => T): T;
  setState?: (partial: Partial<StoreState<TMessage>>) => void;
  _syncState?: (partial: Partial<StoreState<TMessage>>) => void;
}

export type UseChatOptionsWithPerformance<TMessage extends UIMessage = UIMessage> =
  UseChatOptions<TMessage> & {
    store?: CompatibleChatStore<TMessage>;
    enableBatching?: boolean;
  };

export function useChat<TMessage extends UIMessage = UIMessage>(
  options: UseChatOptionsWithPerformance<TMessage> = {} as UseChatOptionsWithPerformance<TMessage>,
): UseChatHelpers<TMessage> {
  const { store: customStore, enableBatching = true, ...originalOptions } = options;

  // Use custom store if provided, otherwise use the context store
  const contextStore = useChatStoreApi<TMessage>();
  const store = customStore || contextStore;

  const chatHelpers = useOriginalChat<TMessage>(originalOptions);

  const storeRef = useRef<CompatibleChatStore<TMessage> | typeof contextStore>(store);

  // Memoize the sync function to avoid recreating it on every render
  const syncState = useCallback((chatState: Partial<StoreState<TMessage>>) => {
    if (!storeRef.current) return;

    if (typeof (storeRef.current as any).getState === "function") {
      const vanillaStore = storeRef.current as any;
      vanillaStore.getState()._syncState(chatState);
    } else if (typeof (storeRef.current as any)._syncState === "function") {
      (storeRef.current as any)._syncState(chatState);
    } else if (typeof (storeRef.current as any).setState === "function") {
      (storeRef.current as any).setState(chatState);
    }
  }, []);

  useEffect(() => {
    const currentStoreState = (store as any).getState?.() || { messages: [] };

    const shouldSyncMessages = !(
      currentStoreState.messages?.length > 0 && chatHelpers.messages.length === 0
    );

    const stateData = {
      id: chatHelpers.id,
      messages: shouldSyncMessages ? chatHelpers.messages : undefined,
      error: chatHelpers.error,
      status: chatHelpers.status,
    };

    const functionsData = {
      sendMessage: chatHelpers.sendMessage,
      regenerate: chatHelpers.regenerate,
      stop: chatHelpers.stop,
      resumeStream: chatHelpers.resumeStream,
      addToolResult: chatHelpers.addToolResult,
      setMessages: chatHelpers.setMessages,
      clearError: chatHelpers.clearError,
    };

    const chatState = { ...stateData, ...functionsData };

    if (enableBatching) {
      if (window?.requestAnimationFrame) {
        window.requestAnimationFrame(() => syncState(chatState));
      } else {
        syncState(chatState);
      }
    } else {
      syncState(chatState);
    }
  }, [
    chatHelpers.id,
    chatHelpers.messages,
    chatHelpers.error,
    chatHelpers.status,
    syncState,
    enableBatching,
    chatHelpers.resumeStream,
    chatHelpers.clearError,
    chatHelpers.sendMessage,
    store,
    chatHelpers.setMessages,
    chatHelpers.stop,
    chatHelpers.regenerate,
    chatHelpers.addToolResult,
  ]);

  return chatHelpers;
}
