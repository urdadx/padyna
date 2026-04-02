import { env } from "@padyna/env/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type LiveChatConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "waiting"
  | "disconnected"
  | "error";

type LiveChatRole = "agent" | "visitor";

type LiveChatRoomState = {
  conversationId: string;
  hasVisitor: boolean;
  hasAgent: boolean;
  visitorJoined: boolean;
  agentJoined: boolean;
  ready: boolean;
};

type LiveChatServerEvent =
  | {
      type: "state";
      state: LiveChatRoomState;
    }
  | {
      type: "conversation_status";
      conversationId: string;
      status: "opened" | "escalated" | "assigned" | "closed";
    }
  | {
      type: "message";
      message: {
        id: string;
        role: "user" | "assistant";
        text: string;
        createdAt: string;
      };
    }
  | {
      type: "typing";
      role: LiveChatRole;
      isTyping: boolean;
    }
  | {
      type: "conflict";
      message: string;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

type UseLiveChatSocketInput = {
  conversationId?: string;
  role: LiveChatRole;
  enabled: boolean;
  autoJoin?: boolean;
  joinToken?: string;
  userName?: string;
  onMessage?: (message: { id: string; role: "user" | "assistant"; text: string; createdAt: string }) => void;
  onConversationStatus?: (payload: {
    conversationId: string;
    status: "opened" | "escalated" | "assigned" | "closed";
  }) => void;
};

function parseEvent(raw: string): LiveChatServerEvent | null {
  try {
    const parsed = JSON.parse(raw) as LiveChatServerEvent;
    return parsed;
  } catch {
    return null;
  }
}

function toWsUrl(conversationId: string): string {
  const url = new URL(`/api/live-chat/${conversationId}/ws`, env.VITE_SERVER_URL);
  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  }
  return url.toString();
}

export function useLiveChatSocket({
  conversationId,
  role,
  enabled,
  autoJoin = false,
  joinToken,
  userName,
  onMessage,
  onConversationStatus,
}: UseLiveChatSocketInput) {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onConversationStatusRef = useRef(onConversationStatus);
  const shouldReconnectRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const joinRequestedRef = useRef(false);

  const [status, setStatus] = useState<LiveChatConnectionStatus>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isPeerJoined, setIsPeerJoined] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAssignedToOther, setIsAssignedToOther] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onConversationStatusRef.current = onConversationStatus;
  }, [onConversationStatus]);

  const closeSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) {
      return;
    }

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }, []);

  const resetState = useCallback((nextStatus: LiveChatConnectionStatus = "idle") => {
    setStatus(nextStatus);
    setIsConnected(false);
    setHasJoined(false);
    setIsPeerJoined(false);
    setIsReady(false);
    setRemoteTyping(false);
    setError(null);
    setIsAssignedToOther(false);
    joinRequestedRef.current = false;
  }, []);

  const send = useCallback((payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const join = useCallback(() => {
    if (!conversationId) {
      return false;
    }

    if (role === "visitor") {
      const token = typeof joinToken === "string" ? joinToken.trim() : "";
      if (!token) {
        return false;
      }
    }

    joinRequestedRef.current = true;

    return send({
      type: "join",
      role,
      token: role === "visitor" ? joinToken : undefined,
      userName,
    });
  }, [conversationId, role, joinToken, userName, send]);

  const connect = useCallback(() => {
    if (!enabled || !conversationId) {
      return;
    }

    const current = socketRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus("connecting");
    setError(null);
    setIsAssignedToOther(false);

    const socket = new WebSocket(toWsUrl(conversationId));
    socketRef.current = socket;

    socket.onopen = () => {
      retryCountRef.current = 0;
      setIsConnected(true);
      setStatus("connected");

      if (autoJoin) {
        join();
      }
    };

    socket.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      const incoming = parseEvent(raw);
      if (!incoming) {
        return;
      }

      if (incoming.type === "state") {
        const state = incoming.state;
        const roleJoined = role === "agent" ? state.agentJoined : state.visitorJoined;
        const myJoined = roleJoined && joinRequestedRef.current;
        const peerJoined = role === "agent" ? state.visitorJoined : state.agentJoined;

        setHasJoined(myJoined);
        setIsPeerJoined(peerJoined);
        setIsReady(state.ready);
        setRemoteTyping(false);

        if (state.ready) {
          setStatus("connected");
          return;
        }

        if (myJoined || peerJoined) {
          setStatus("waiting");
          return;
        }

        setStatus("connected");
        return;
      }

      if (incoming.type === "message") {
        onMessageRef.current?.(incoming.message);
        return;
      }

      if (incoming.type === "conversation_status") {
        onConversationStatusRef.current?.({
          conversationId: incoming.conversationId,
          status: incoming.status,
        });
        return;
      }

      if (incoming.type === "typing") {
        if (incoming.role !== role) {
          setRemoteTyping(incoming.isTyping);
        }
        return;
      }

      if (incoming.type === "conflict") {
        setIsAssignedToOther(true);
        setStatus("error");
        setError(incoming.message);
        return;
      }

      setStatus("error");
      setError(incoming.message);
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      setHasJoined(false);
      setIsPeerJoined(false);
      setIsReady(false);
      setRemoteTyping(false);

      if (conversationId && (event.code === 4002 || event.code === 4004)) {
        onConversationStatusRef.current?.({
          conversationId,
          status: event.code === 4004 ? "closed" : "opened",
        });
      }

      const nonRetryableCodes = new Set([4002, 4004, 4401, 4403, 4404]);

      if (!enabled || !shouldReconnectRef.current || nonRetryableCodes.has(event.code)) {
        setStatus("disconnected");
        return;
      }

      const retryDelay = Math.min(1_000 * 2 ** retryCountRef.current, 8_000);
      retryCountRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, retryDelay);
      setStatus("connecting");
    };

    socket.onerror = () => {
      setStatus("error");
      setError("Could not establish live chat connection.");
    };
  }, [enabled, conversationId, autoJoin, join, role]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    closeSocket();
    resetState("idle");
  }, [closeSocket, resetState]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !isReady) {
        return false;
      }

      return send({ type: "message", text: trimmed });
    },
    [isReady, send],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!isReady) {
        return false;
      }

      return send({ type: "typing", isTyping });
    },
    [isReady, send],
  );

  useEffect(() => {
    shouldReconnectRef.current = enabled;

    if (!enabled || !conversationId) {
      shouldReconnectRef.current = false;
      closeSocket();
      resetState("idle");
      return;
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      closeSocket();
      resetState("idle");
    };
  }, [enabled, conversationId, connect, closeSocket, resetState]);

  useEffect(() => {
    if (!enabled || !autoJoin || !isConnected || hasJoined) {
      return;
    }

    if (role === "visitor") {
      const token = typeof joinToken === "string" ? joinToken.trim() : "";
      if (!token) {
        return;
      }
    }

    join();
  }, [enabled, autoJoin, isConnected, hasJoined, join, role, joinToken]);

  const canSendMessages = useMemo(() => isConnected && hasJoined && isReady, [isConnected, hasJoined, isReady]);

  return {
    status,
    isConnected,
    hasJoined,
    isPeerJoined,
    isReady,
    canSendMessages,
    remoteTyping,
    error,
    isAssignedToOther,
    connect,
    disconnect,
    join,
    sendMessage,
    sendTyping,
  };
}
