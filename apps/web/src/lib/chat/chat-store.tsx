import {
  useChat as useAiChat,
  type UIMessage,
  type UseChatHelpers,
  type UseChatOptions,
} from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ChatStoreState<TMessage extends UIMessage = UIMessage> = {
  id: string | undefined;
  messages: TMessage[];
  status: ChatStatus;
  error: Error | undefined;
  sendMessage: UseChatHelpers<TMessage>["sendMessage"] | null;
  setMessages: UseChatHelpers<TMessage>["setMessages"] | null;
  stop: UseChatHelpers<TMessage>["stop"] | null;
};

type ChatStoreApi<TMessage extends UIMessage = UIMessage> = {
  getState: () => ChatStoreState<TMessage>;
  setState: (partial: Partial<ChatStoreState<TMessage>>) => void;
  subscribe: (listener: () => void) => () => void;
};

function createChatStore<TMessage extends UIMessage>(): ChatStoreApi<TMessage> {
  let state: ChatStoreState<TMessage> = {
    id: undefined,
    messages: [],
    status: "ready",
    error: undefined,
    sendMessage: null,
    setMessages: null,
    stop: null,
  };

  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (partial) => {
      let hasChanges = false;
      for (const key of Object.keys(partial) as Array<keyof ChatStoreState<TMessage>>) {
        if (!Object.is(state[key], partial[key])) {
          hasChanges = true;
          break;
        }
      }

      if (!hasChanges) {
        return;
      }

      state = { ...state, ...partial };
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const ChatStoreContext = createContext<ChatStoreApi<UIMessage> | null>(null);

type ChatStoreProviderProps<TMessage extends UIMessage = UIMessage> = {
  children: ReactNode;
  options: UseChatOptions<TMessage>;
  throttleMs?: number;
};

function ChatBridge<TMessage extends UIMessage>({
  store,
  options,
  throttleMs,
}: {
  store: ChatStoreApi<TMessage>;
  options: UseChatOptions<TMessage>;
  throttleMs: number;
}) {
  const { id, messages, status, error, sendMessage, setMessages, stop } = useAiChat(options);

  const pendingMessagesRef = useRef<TMessage[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushMessages = useCallback(() => {
    if (!pendingMessagesRef.current) {
      return;
    }

    store.setState({ messages: pendingMessagesRef.current });
    pendingMessagesRef.current = null;
  }, [store]);

  useEffect(() => {
    pendingMessagesRef.current = messages;

    if (throttleMs <= 0 || status !== "streaming") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flushMessages();
      return;
    }

    if (timerRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushMessages();
    }, throttleMs);
  }, [messages, status, throttleMs, flushMessages]);

  useEffect(() => {
    store.setState({ id, status, error });
  }, [id, status, error, store]);

  useEffect(() => {
    store.setState({ sendMessage, setMessages, stop });
  }, [sendMessage, setMessages, stop, store]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flushMessages();
    };
  }, [flushMessages]);

  return null;
}

export function ChatStoreProvider<TMessage extends UIMessage = UIMessage>({
  children,
  options,
  throttleMs = 50,
}: ChatStoreProviderProps<TMessage>) {
  const storeRef = useRef<ChatStoreApi<TMessage>>(createChatStore<TMessage>());

  return (
    <ChatStoreContext.Provider value={storeRef.current as ChatStoreApi<UIMessage>}>
      <ChatBridge store={storeRef.current} options={options} throttleMs={throttleMs} />
      {children}
    </ChatStoreContext.Provider>
  );
}

function useChatStoreApi<TMessage extends UIMessage = UIMessage>() {
  const store = useContext(ChatStoreContext) as ChatStoreApi<TMessage> | null;
  if (!store) {
    throw new Error("useStoreChat must be used within ChatStoreProvider");
  }
  return store;
}

function useChatStoreSelector<TMessage extends UIMessage, T>(
  selector: (state: ChatStoreState<TMessage>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
) {
  const store = useChatStoreApi<TMessage>();
  const selectedRef = useRef(selector(store.getState()));

  return useSyncExternalStore(
    store.subscribe,
    () => {
      const next = selector(store.getState());
      if (equalityFn(selectedRef.current, next)) {
        return selectedRef.current;
      }
      selectedRef.current = next;
      return next;
    },
    () => selectedRef.current,
  );
}

export function useStoreChat<TMessage extends UIMessage = UIMessage>() {
  const store = useChatStoreApi<TMessage>();
  const id = useChatStoreSelector<TMessage, string | undefined>((state) => state.id);
  const messages = useChatStoreSelector<TMessage, TMessage[]>((state) => state.messages);
  const status = useChatStoreSelector<TMessage, ChatStatus>((state) => state.status);
  const error = useChatStoreSelector<TMessage, Error | undefined>((state) => state.error);

  const sendMessage = useCallback<UseChatHelpers<TMessage>["sendMessage"]>(
    async (...args) => {
      const action = store.getState().sendMessage;
      if (!action) {
        return;
      }
      return action(...args);
    },
    [store],
  );

  const setMessages = useCallback<UseChatHelpers<TMessage>["setMessages"]>(
    (...args) => {
      const action = store.getState().setMessages;
      if (action) {
        action(...args);
        return;
      }

      const [nextMessages] = args;
      if (Array.isArray(nextMessages)) {
        store.setState({ messages: nextMessages });
      }
    },
    [store],
  );

  const stop: UseChatHelpers<TMessage>["stop"] = useCallback(async () => {
    await store.getState().stop?.();
  }, [store]);

  return useMemo(
    () => ({
      id,
      messages,
      status,
      error,
      sendMessage,
      setMessages,
      stop,
    }),
    [id, messages, status, error, sendMessage, setMessages, stop],
  );
}
