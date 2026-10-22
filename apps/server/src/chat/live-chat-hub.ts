import { timingSafeEqual } from "node:crypto";
import type {
  JoinLiveChatEvent,
  LiveChatRole,
  LiveChatRoomState,
  LiveChatServerEvent,
} from "./live-chat-protocol";
import { parseLiveChatClientEvent } from "./live-chat-protocol";

// In-memory live chat rooms: one per escalated conversation, holding at most
// one joined visitor and one joined agent. Every socket that connects to a
// conversation is in its room so it hears status changes (that is how the
// widget learns it was escalated), but message content only reaches the joined
// visitor, the joined agent, and dashboard members verified as observers.
// Persistence and auth live behind `LiveChatStore` so this stays testable.

export type ConversationStatus = "opened" | "escalated" | "assigned" | "closed";

export type ConversationMeta = {
  id: string;
  chatbotId: string;
  organizationId: string;
  status: string;
  assignedTo: string | null;
  metadata: Record<string, unknown> | null;
};

export type AgentAuthResult =
  | { ok: true; userId: string; userName: string }
  | { ok: false; code: string; message: string };

export type LiveChatStore = {
  getConversation(conversationId: string): Promise<ConversationMeta | null>;
  authenticateAgent(headers: Headers, conversation: ConversationMeta): Promise<AgentAuthResult>;
  /** Saves a live message and bumps the conversation; resolves with its id and time. */
  saveMessage(input: {
    conversation: ConversationMeta;
    role: "user" | "assistant";
    text: string;
    userId: string | null;
  }): Promise<{ id: string; createdAt: string }>;
  assignAgent(conversationId: string, userId: string): Promise<void>;
  notify(input: {
    conversation: ConversationMeta;
    eventType: "conversation.agent_joined" | "conversation.human_joined";
    actorUserId?: string;
    name: string;
  }): Promise<void>;
};

export type WsLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

/** Longest live message accepted, in characters. */
export const MAX_LIVE_MESSAGE_LENGTH = 4_000;
/** Sockets allowed per conversation (visitor tabs, agent tabs, observers). */
export const MAX_CONNECTIONS_PER_ROOM = 16;

export const CLOSE_CODES = {
  replaced: 4001,
  notEscalated: 4002,
  unauthorized: 4401,
  forbidden: 4403,
  notFound: 4404,
  conversationClosed: 4004,
  tryAgainLater: 1013,
} as const;

type Connection = {
  id: string;
  ws: WsLike;
  conversationId: string;
  role: LiveChatRole | null;
  userId: string | null;
  /** Conversation loaded at join time; kept current by status broadcasts. */
  conversation: ConversationMeta | null;
  /** A verified dashboard member who may read messages without joining. */
  observer: boolean;
  /** Incoming events are handled one at a time, in arrival order. */
  queue: Promise<void>;
  closed: boolean;
};

type Room = {
  conversationId: string;
  connections: Set<Connection>;
  visitor: Connection | null;
  agent: Connection | null;
  visitorTyping: boolean;
  agentTyping: boolean;
};

const ACTIVE_STATUSES = new Set(["escalated", "assigned"]);

function tokensMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getLiveChatToken(metadata: Record<string, unknown> | null): string | null {
  const token = metadata?.liveChatToken;
  return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
}

export function createLiveChatHub(
  store: LiveChatStore,
  options: { createId?: () => string; logError?: (message: string, error: unknown) => void } = {},
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const logError = options.logError ?? ((message, error) => console.error(message, error));
  const connections = new Map<string, Connection>();
  const rooms = new Map<string, Room>();

  const isLive = (connection: Connection) =>
    !connection.closed && connections.get(connection.id) === connection;

  const send = (connection: Connection, payload: string) => {
    if (connection.closed) return;
    try {
      connection.ws.send(payload);
    } catch (error) {
      logError("[live-chat] send failed", error);
    }
  };

  const sendEvent = (connection: Connection, event: LiveChatServerEvent) =>
    send(connection, JSON.stringify(event));

  const sendError = (connection: Connection, code: string, message: string) =>
    sendEvent(connection, { type: "error", code, message });

  const closeConnection = (connection: Connection, code: number, reason: string) => {
    try {
      connection.ws.close(code, reason);
    } catch (error) {
      logError("[live-chat] close failed", error);
    }
    removeConnection(connection, { announce: false });
  };

  const roomState = (room: Room): LiveChatRoomState => ({
    conversationId: room.conversationId,
    hasVisitor: room.visitor !== null,
    hasAgent: room.agent !== null,
    visitorJoined: room.visitor !== null,
    agentJoined: room.agent !== null,
    ready: room.visitor !== null && room.agent !== null,
  });

  /** Stringifies once and sends to every socket in the room. */
  const broadcast = (room: Room, event: LiveChatServerEvent) => {
    const payload = JSON.stringify(event);
    for (const connection of room.connections) send(connection, payload);
  };

  const broadcastState = (room: Room) => broadcast(room, { type: "state", state: roomState(room) });

  /** The joined visitor and agent, plus verified observers. */
  const sendToParticipants = (room: Room, event: LiveChatServerEvent) => {
    const payload = JSON.stringify(event);
    for (const connection of room.connections) {
      if (connection === room.visitor || connection === room.agent || connection.observer) {
        send(connection, payload);
      }
    }
  };

  function removeConnection(connection: Connection, { announce }: { announce: boolean }) {
    if (connection.closed) return;
    connection.closed = true;
    connections.delete(connection.id);

    const room = rooms.get(connection.conversationId);
    if (!room) return;
    room.connections.delete(connection);

    let participantLeft = false;
    if (room.agent === connection) {
      room.agent = null;
      room.agentTyping = false;
      participantLeft = true;
    }
    if (room.visitor === connection) {
      room.visitor = null;
      room.visitorTyping = false;
      participantLeft = true;
    }

    if (room.connections.size === 0) {
      rooms.delete(connection.conversationId);
    } else if (participantLeft && announce) {
      broadcastState(room);
    }
  }

  /** Closes an earlier socket of the same role (e.g. another tab) before a rejoin. */
  const replaceParticipant = (room: Room, role: LiveChatRole, next: Connection) => {
    const existing = role === "agent" ? room.agent : room.visitor;
    if (existing && existing !== next) {
      closeConnection(existing, CLOSE_CODES.replaced, "Connection replaced");
    }
  };

  const notifyInBackground = (input: Parameters<LiveChatStore["notify"]>[0]) => {
    store.notify(input).catch((error) => logError(`[live-chat] ${input.eventType} notification failed`, error));
  };

  async function handleJoin(connection: Connection, event: JoinLiveChatEvent, headers: Headers) {
    const conversation = await store.getConversation(connection.conversationId);
    if (!isLive(connection)) return;

    if (!conversation) {
      sendError(connection, "NOT_FOUND", "Conversation not found.");
      closeConnection(connection, CLOSE_CODES.notFound, "Conversation not found");
      return;
    }

    if (!ACTIVE_STATUSES.has(conversation.status)) {
      sendError(connection, "INVALID_STATUS", "Conversation is not in escalated mode.");
      return;
    }

    if (!connection.role) {
      sendEvent(connection, {
        type: "conversation_status_changed",
        conversationId: conversation.id,
        status: conversation.status as ConversationStatus,
      });
    }

    if (event.role === "agent") {
      const auth = await store.authenticateAgent(headers, conversation);
      if (!isLive(connection)) return;

      if (!auth.ok) {
        sendError(connection, auth.code, auth.message);
        closeConnection(connection, CLOSE_CODES.unauthorized, auth.message);
        return;
      }

      const room = rooms.get(connection.conversationId)!;
      if (room.agent && room.agent !== connection && room.agent.userId !== auth.userId) {
        sendEvent(connection, {
          type: "conflict",
          message: "Another agent is already joined in this conversation.",
        });
        return;
      }

      replaceParticipant(room, "agent", connection);
      room.agent = connection;
      room.agentTyping = false;
      connection.role = "agent";
      connection.userId = auth.userId;
      connection.conversation = conversation;

      // Rejoining (a refresh, a reconnect) needs no write when nothing changed.
      if (conversation.status !== "assigned" || conversation.assignedTo !== auth.userId) {
        await store.assignAgent(conversation.id, auth.userId);
        conversation.status = "assigned";
        conversation.assignedTo = auth.userId;
      }

      broadcast(room, {
        type: "conversation_status_changed",
        conversationId: conversation.id,
        status: "assigned",
      });
      notifyInBackground({
        conversation,
        eventType: "conversation.agent_joined",
        actorUserId: auth.userId,
        name: auth.userName,
      });
      broadcastState(room);
      return;
    }

    const expectedToken = getLiveChatToken(conversation.metadata);
    const access = !expectedToken
      ? { code: "MISSING_TOKEN", message: "Live chat has not been initialized for this conversation." }
      : !event.token
        ? { code: "INVALID_TOKEN", message: "A valid visitor token is required." }
        : !tokensMatch(expectedToken, event.token)
          ? { code: "FORBIDDEN", message: "Invalid live chat token." }
          : null;

    if (access) {
      sendError(connection, access.code, access.message);
      closeConnection(connection, CLOSE_CODES.forbidden, access.message);
      return;
    }

    const room = rooms.get(connection.conversationId)!;
    replaceParticipant(room, "visitor", connection);
    room.visitor = connection;
    room.visitorTyping = false;
    connection.role = "visitor";
    connection.conversation = conversation;

    notifyInBackground({
      conversation,
      eventType: "conversation.human_joined",
      name: event.userName ?? "Visitor",
    });
    broadcastState(room);
  }

  async function handleMessage(connection: Connection, text: string) {
    if (!connection.role || !connection.conversation) {
      sendError(connection, "JOIN_REQUIRED", "Join before sending a message.");
      return;
    }

    const room = rooms.get(connection.conversationId);
    if (!room?.agent || !room.visitor) {
      sendError(connection, "NOT_READY", "Both parties must join before chat can start.");
      return;
    }

    if (text.length > MAX_LIVE_MESSAGE_LENGTH) {
      sendError(connection, "MESSAGE_TOO_LONG", `Messages are limited to ${MAX_LIVE_MESSAGE_LENGTH} characters.`);
      return;
    }

    const role = connection.role === "agent" ? "assistant" : "user";
    const saved = await store.saveMessage({
      conversation: connection.conversation,
      role,
      text,
      userId: connection.role === "agent" ? connection.userId : null,
    });

    // The room may have closed while saving; deliver to whoever is still here.
    const current = rooms.get(connection.conversationId);
    if (!current) return;

    sendToParticipants(current, {
      type: "message",
      message: { id: saved.id, role, text, createdAt: saved.createdAt },
    });
  }

  function handleTyping(connection: Connection, isTyping: boolean) {
    if (!connection.role) {
      sendError(connection, "JOIN_REQUIRED", "Join before sending typing state.");
      return;
    }

    const room = rooms.get(connection.conversationId);
    if (!room?.agent || !room.visitor) return;

    // Only changes are relayed; repeated "still typing" events are dropped.
    if (connection.role === "agent") {
      if (room.agentTyping === isTyping) return;
      room.agentTyping = isTyping;
      sendEvent(room.visitor, { type: "typing", role: "agent", isTyping });
    } else {
      if (room.visitorTyping === isTyping) return;
      room.visitorTyping = isTyping;
      sendEvent(room.agent, { type: "typing", role: "visitor", isTyping });
    }
  }

  async function processEvent(connection: Connection, raw: string, headers: Headers) {
    const event = parseLiveChatClientEvent(raw);
    if (!event) {
      sendError(connection, "BAD_EVENT", "Invalid event payload.");
      return;
    }

    if (event.type === "join") return handleJoin(connection, event, headers);
    if (event.type === "message") return handleMessage(connection, event.text);
    handleTyping(connection, event.isTyping);
  }

  /** Lets a signed-in dashboard member read messages without joining. */
  async function verifyObserver(connection: Connection, headers: Headers) {
    try {
      const conversation = await store.getConversation(connection.conversationId);
      if (!conversation || !isLive(connection)) return;
      const auth = await store.authenticateAgent(headers, conversation);
      if (auth.ok && isLive(connection)) connection.observer = true;
    } catch (error) {
      logError("[live-chat] observer check failed", error);
    }
  }

  return {
    /** Returns the connection id, or null when the room is full (socket closed). */
    registerConnection(input: { ws: WsLike; conversationId: string; headers?: Headers }): string | null {
      let room = rooms.get(input.conversationId);
      if (room && room.connections.size >= MAX_CONNECTIONS_PER_ROOM) {
        try {
          input.ws.close(CLOSE_CODES.tryAgainLater, "Too many connections");
        } catch {}
        return null;
      }

      if (!room) {
        room = {
          conversationId: input.conversationId,
          connections: new Set(),
          visitor: null,
          agent: null,
          visitorTyping: false,
          agentTyping: false,
        };
        rooms.set(input.conversationId, room);
      }

      const connection: Connection = {
        id: createId(),
        ws: input.ws,
        conversationId: input.conversationId,
        role: null,
        userId: null,
        conversation: null,
        observer: false,
        queue: Promise.resolve(),
        closed: false,
      };
      connections.set(connection.id, connection);
      room.connections.add(connection);

      // Only the newcomer needs the current state; nobody else's view changed.
      sendEvent(connection, { type: "state", state: roomState(room) });

      // Only requests carrying a session cookie can belong to dashboard members.
      if (input.headers?.get("cookie")) void verifyObserver(connection, input.headers);

      return connection.id;
    },

    /** Queues an incoming frame; frames from one socket are handled in order. */
    handleIncomingMessage(input: { connectionId: string; raw: string; headers: Headers }) {
      const connection = connections.get(input.connectionId);
      if (!connection) return Promise.resolve();

      connection.queue = connection.queue
        .then(() => (isLive(connection) ? processEvent(connection, input.raw, input.headers) : undefined))
        .catch((error) => {
          logError("[live-chat] failed to handle event", error);
          sendError(connection, "INTERNAL", "Something went wrong. Please try again.");
        });
      return connection.queue;
    },

    unregisterConnection(connectionId: string) {
      const connection = connections.get(connectionId);
      if (connection) removeConnection(connection, { announce: true });
    },

    /**
     * Reopening or closing a conversation ends the live session: everyone hears
     * the new status and the sockets close. Other statuses are just announced.
     */
    broadcastConversationStatus(input: { conversationId: string; status: ConversationStatus }) {
      const room = rooms.get(input.conversationId);
      if (!room) return;

      for (const connection of room.connections) {
        if (connection.conversation) connection.conversation.status = input.status;
      }
      broadcast(room, {
        type: "conversation_status_changed",
        conversationId: input.conversationId,
        status: input.status,
      });

      if (input.status === "closed" || input.status === "opened") {
        const code = input.status === "closed" ? CLOSE_CODES.conversationClosed : CLOSE_CODES.notEscalated;
        const reason = input.status === "closed" ? "Conversation closed" : "Conversation no longer escalated";
        rooms.delete(input.conversationId);
        for (const connection of room.connections) closeConnection(connection, code, reason);
      }
    },

    /** Counts for tests and diagnostics. */
    stats() {
      return { connections: connections.size, rooms: rooms.size };
    },
  };
}

export type LiveChatHub = ReturnType<typeof createLiveChatHub>;
