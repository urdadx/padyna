import { randomUUID } from "node:crypto";
import { auth } from "@padyna/auth";
import { db } from "@padyna/db";
import { chatConversation, chatMessage } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import type {
  LiveChatClientEvent,
  LiveChatRole,
  LiveChatRoomState,
  LiveChatServerEvent,
} from "./live-chat-protocol";
import { parseLiveChatClientEvent, stringifyLiveChatServerEvent } from "./live-chat-protocol";

type WsLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

type SocketContext = {
  ws: WsLike;
  connectionId: string;
  conversationId: string;
  role: LiveChatRole | null;
  userId: string | null;
  userName: string | null;
};

type RoomState = {
  conversationId: string;
  sockets: Set<string>;
  visitorConnectionId: string | null;
  visitorJoined: boolean;
  visitorTyping: boolean;
  agentConnectionId: string | null;
  agentUserId: string | null;
  agentUserName: string | null;
  agentJoined: boolean;
  agentTyping: boolean;
};

type ConversationLifecycleStatus = "opened" | "escalated" | "assigned" | "closed";

type ConversationMeta = {
  id: string;
  chatbotId: string;
  organizationId: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

const socketRegistry = new Map<string, SocketContext>();
const roomRegistry = new Map<string, RoomState>();

function toRoomStatePayload(room: RoomState): LiveChatRoomState {
  return {
    conversationId: room.conversationId,
    hasVisitor: room.visitorConnectionId !== null,
    hasAgent: room.agentConnectionId !== null,
    visitorJoined: room.visitorJoined,
    agentJoined: room.agentJoined,
    ready: room.visitorJoined && room.agentJoined,
  };
}

function ensureRoom(conversationId: string): RoomState {
  const existing = roomRegistry.get(conversationId);
  if (existing) {
    return existing;
  }

  const created: RoomState = {
    conversationId,
    sockets: new Set(),
    visitorConnectionId: null,
    visitorJoined: false,
    visitorTyping: false,
    agentConnectionId: null,
    agentUserId: null,
    agentUserName: null,
    agentJoined: false,
    agentTyping: false,
  };

  roomRegistry.set(conversationId, created);
  return created;
}

function sendEvent(ws: WsLike, event: LiveChatServerEvent) {
  ws.send(stringifyLiveChatServerEvent(event));
}

function sendError(ws: WsLike, code: string, message: string) {
  sendEvent(ws, {
    type: "error",
    code,
    message,
  });
}

function getRoomSockets(room: RoomState): SocketContext[] {
  const sockets: SocketContext[] = [];
  for (const connectionId of room.sockets) {
    const socket = socketRegistry.get(connectionId);
    if (socket) {
      sockets.push(socket);
    }
  }
  return sockets;
}

function broadcastRoomState(room: RoomState) {
  const payload = toRoomStatePayload(room);
  const sockets = getRoomSockets(room);
  for (const socket of sockets) {
    sendEvent(socket.ws, {
      type: "state",
      state: payload,
    });
  }
}

function broadcastConversationStatus(
  room: RoomState,
  status: "opened" | "escalated" | "assigned" | "closed",
) {
  const sockets = getRoomSockets(room);
  for (const socket of sockets) {
    sendEvent(socket.ws, {
      type: "conversation_status_changed",
      conversationId: room.conversationId,
      status,
    });
  }
}

function closeRoomConnections(
  room: RoomState,
  input: {
    code: number;
    reason: string;
    status?: ConversationLifecycleStatus;
  },
) {
  const sockets = getRoomSockets(room);

  if (input.status) {
    for (const socket of sockets) {
      sendEvent(socket.ws, {
        type: "conversation_status_changed",
        conversationId: room.conversationId,
        status: input.status,
      });
    }
  }

  for (const socket of sockets) {
    socket.ws.close(input.code, input.reason);
    cleanupConnection(socket);
  }
}

function handleConversationStatusLifecycle(room: RoomState, status: ConversationLifecycleStatus) {
  if (status === "closed") {
    closeRoomConnections(room, {
      code: 4004,
      reason: "Conversation closed",
      status,
    });
    return;
  }

  if (status === "opened") {
    closeRoomConnections(room, {
      code: 4002,
      reason: "Conversation no longer escalated",
      status,
    });
    return;
  }

  broadcastConversationStatus(room, status);
}

function broadcastToOtherRole(
  room: RoomState,
  senderConnectionId: string,
  event: LiveChatServerEvent,
) {
  const sender = socketRegistry.get(senderConnectionId);
  if (!sender || !sender.role) {
    return;
  }

  const targetRole: LiveChatRole = sender.role === "agent" ? "visitor" : "agent";
  const sockets = getRoomSockets(room);
  for (const socket of sockets) {
    if (socket.connectionId === senderConnectionId) {
      continue;
    }
    if (socket.role !== targetRole) {
      continue;
    }
    sendEvent(socket.ws, event);
  }
}

function getLiveChatToken(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) {
    return null;
  }

  const token = metadata.liveChatToken;
  if (typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getConversationMeta(conversationId: string): Promise<ConversationMeta | null> {
  const [conversation] = await db
    .select({
      id: chatConversation.id,
      chatbotId: chatConversation.chatbotId,
      organizationId: chatConversation.organizationId,
      status: chatConversation.status,
      metadata: chatConversation.metadata,
    })
    .from(chatConversation)
    .where(eq(chatConversation.id, conversationId))
    .limit(1);

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    chatbotId: conversation.chatbotId,
    organizationId: conversation.organizationId,
    status: conversation.status,
    metadata: (conversation.metadata ?? null) as Record<string, unknown> | null,
  };
}

async function verifyAgentAccess(
  headers: Headers,
  conversation: ConversationMeta,
): Promise<
  | {
      ok: true;
      userId: string;
      userName: string;
    }
  | { ok: false; code: string; message: string }
> {
  const session = await auth.api.getSession({ headers });

  if (!session?.session || !session.user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Agent session is required.",
    };
  }

  if (
    session.session.activeOrganization !== conversation.organizationId ||
    session.session.activeChatbot !== conversation.chatbotId
  ) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You do not have access to this conversation.",
    };
  }

  const userName =
    typeof session.user.name === "string" && session.user.name.trim().length > 0
      ? session.user.name.trim()
      : "Human Agent";

  return {
    ok: true,
    userId: session.user.id,
    userName,
  };
}

async function verifyVisitorAccess(
  conversation: ConversationMeta,
  providedToken: string | undefined,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const expectedToken = getLiveChatToken(conversation.metadata);

  if (!expectedToken) {
    return {
      ok: false,
      code: "MISSING_TOKEN",
      message: "Live chat has not been initialized for this conversation.",
    };
  }

  const token = typeof providedToken === "string" ? providedToken.trim() : "";
  if (!token) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "A valid visitor token is required.",
    };
  }

  if (token !== expectedToken) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Invalid live chat token.",
    };
  }

  return { ok: true };
}

async function persistLiveMessage(input: {
  conversation: ConversationMeta;
  role: "user" | "assistant";
  text: string;
  userId?: string | null;
}) {
  const messageId = randomUUID();

  await db.insert(chatMessage).values({
    conversationId: input.conversation.id,
    chatbotId: input.conversation.chatbotId,
    organizationId: input.conversation.organizationId,
    userId: input.userId ?? undefined,
    role: input.role,
    messageId,
    contentText: input.text,
    parts: [{ type: "text", text: input.text }],
  });

  await db
    .update(chatConversation)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversation.id, input.conversation.id));

  return {
    id: messageId,
    role: input.role,
    text: input.text,
    createdAt: new Date().toISOString(),
  };
}

async function handleJoinEvent(
  socket: SocketContext,
  event: LiveChatClientEvent,
  headers: Headers,
) {
  if (event.type !== "join") {
    sendError(socket.ws, "JOIN_REQUIRED", "You must join before sending other events.");
    return;
  }

  const conversation = await getConversationMeta(socket.conversationId);
  if (!conversation) {
    sendError(socket.ws, "NOT_FOUND", "Conversation not found.");
    socket.ws.close(4404, "Conversation not found");
    return;
  }

  if (conversation.status !== "escalated" && conversation.status !== "assigned") {
    sendError(socket.ws, "INVALID_STATUS", "Conversation is not in escalated mode.");
    return;
  }

  const room = ensureRoom(socket.conversationId);

  if (!socket.role) {
    sendEvent(socket.ws, {
      type: "conversation_status_changed",
      conversationId: conversation.id,
      status: conversation.status as "opened" | "escalated" | "assigned" | "closed",
    });
  }

  if (event.role === "agent") {
    const authResult = await verifyAgentAccess(headers, conversation);
    if (!authResult.ok) {
      sendError(socket.ws, authResult.code, authResult.message);
      socket.ws.close(4401, authResult.message);
      return;
    }

    if (
      room.agentConnectionId !== null &&
      room.agentConnectionId !== socket.connectionId &&
      room.agentUserId !== authResult.userId
    ) {
      sendEvent(socket.ws, {
        type: "conflict",
        message: "Another agent is already joined in this conversation.",
      });
      return;
    }

    replaceExistingRoleConnection(room, "agent", socket.connectionId);

    room.agentConnectionId = socket.connectionId;
    room.agentUserId = authResult.userId;
    room.agentUserName = authResult.userName;
    room.agentJoined = true;
    room.agentTyping = false;
    socket.role = "agent";
    socket.userId = authResult.userId;
    socket.userName = authResult.userName;

    await db
      .update(chatConversation)
      .set({
        status: "assigned",
        assignedTo: authResult.userId,
        updatedAt: new Date(),
      })
      .where(eq(chatConversation.id, conversation.id));

    broadcastConversationStatus(room, "assigned");
  } else {
    const visitorAccess = await verifyVisitorAccess(conversation, event.token);
    if (!visitorAccess.ok) {
      sendError(socket.ws, visitorAccess.code, visitorAccess.message);
      socket.ws.close(4403, visitorAccess.message);
      return;
    }

    replaceExistingRoleConnection(room, "visitor", socket.connectionId);

    room.visitorConnectionId = socket.connectionId;
    room.visitorJoined = true;
    room.visitorTyping = false;
    socket.role = "visitor";
    socket.userId = null;
    socket.userName = event.userName ?? "Visitor";
  }

  broadcastRoomState(room);
}

async function handleMessageEvent(socket: SocketContext, event: LiveChatClientEvent) {
  if (event.type !== "message") {
    return;
  }

  if (!socket.role) {
    sendError(socket.ws, "JOIN_REQUIRED", "Join before sending a message.");
    return;
  }

  const room = roomRegistry.get(socket.conversationId);
  if (!room) {
    sendError(socket.ws, "ROOM_NOT_FOUND", "Live room not found.");
    return;
  }

  if (!room.agentJoined || !room.visitorJoined) {
    sendError(socket.ws, "NOT_READY", "Both parties must join before chat can start.");
    return;
  }

  const conversation = await getConversationMeta(socket.conversationId);
  if (!conversation) {
    sendError(socket.ws, "NOT_FOUND", "Conversation not found.");
    return;
  }

  const persisted = await persistLiveMessage({
    conversation,
    role: socket.role === "agent" ? "assistant" : "user",
    text: event.text,
    userId: socket.role === "agent" ? socket.userId : undefined,
  });

  const outbound: LiveChatServerEvent = {
    type: "message",
    message: persisted,
  };

  for (const target of getRoomSockets(room)) {
    sendEvent(target.ws, outbound);
  }
}

function handleTypingEvent(socket: SocketContext, event: LiveChatClientEvent) {
  if (event.type !== "typing") {
    return;
  }

  if (!socket.role) {
    sendError(socket.ws, "JOIN_REQUIRED", "Join before sending typing state.");
    return;
  }

  const room = roomRegistry.get(socket.conversationId);
  if (!room) {
    return;
  }

  if (!room.agentJoined || !room.visitorJoined) {
    return;
  }

  if (socket.role === "agent") {
    room.agentTyping = event.isTyping;
  } else {
    room.visitorTyping = event.isTyping;
  }

  broadcastToOtherRole(room, socket.connectionId, {
    type: "typing",
    role: socket.role,
    isTyping: event.isTyping,
  });
}

function cleanupConnection(socket: SocketContext) {
  socketRegistry.delete(socket.connectionId);
  const room = roomRegistry.get(socket.conversationId);
  if (!room) {
    return;
  }

  room.sockets.delete(socket.connectionId);

  if (room.agentConnectionId === socket.connectionId) {
    room.agentConnectionId = null;
    room.agentJoined = false;
    room.agentTyping = false;
  }

  if (room.visitorConnectionId === socket.connectionId) {
    room.visitorConnectionId = null;
    room.visitorJoined = false;
    room.visitorTyping = false;
  }

  if (room.sockets.size === 0) {
    roomRegistry.delete(socket.conversationId);
    return;
  }

  broadcastRoomState(room);
}

function replaceExistingRoleConnection(
  room: RoomState,
  role: LiveChatRole,
  nextConnectionId: string,
) {
  const existingConnectionId = role === "agent" ? room.agentConnectionId : room.visitorConnectionId;

  if (!existingConnectionId || existingConnectionId === nextConnectionId) {
    return;
  }

  const existingSocket = socketRegistry.get(existingConnectionId);
  if (!existingSocket) {
    return;
  }

  existingSocket.ws.close(4001, "Connection replaced");
  cleanupConnection(existingSocket);
}

export const liveChatService = {
  registerConnection(input: { ws: WsLike; conversationId: string }) {
    const connectionId = randomUUID();
    const socket: SocketContext = {
      ws: input.ws,
      connectionId,
      conversationId: input.conversationId,
      role: null,
      userId: null,
      userName: null,
    };

    socketRegistry.set(connectionId, socket);

    const room = ensureRoom(input.conversationId);
    room.sockets.add(connectionId);

    broadcastRoomState(room);

    return connectionId;
  },

  async handleIncomingMessage(input: { connectionId: string; raw: string; headers: Headers }) {
    const socket = socketRegistry.get(input.connectionId);
    if (!socket) {
      return;
    }

    const event = parseLiveChatClientEvent(input.raw);
    if (!event) {
      sendError(socket.ws, "BAD_EVENT", "Invalid event payload.");
      return;
    }

    if (event.type === "join") {
      await handleJoinEvent(socket, event, input.headers);
      return;
    }

    await handleMessageEvent(socket, event);
    handleTypingEvent(socket, event);
  },

  unregisterConnection(connectionId: string) {
    const socket = socketRegistry.get(connectionId);
    if (!socket) {
      return;
    }
    cleanupConnection(socket);
  },
};

export function generateLiveChatToken(): string {
  return randomUUID();
}

export async function initializeLiveChatConversation(input: {
  conversationId: string;
  status?: "escalated" | "assigned";
  reason?: string;
  summary?: string;
}) {
  const [existingConversation] = await db
    .select({
      id: chatConversation.id,
      metadata: chatConversation.metadata,
    })
    .from(chatConversation)
    .where(eq(chatConversation.id, input.conversationId))
    .limit(1);

  if (!existingConversation) {
    return null;
  }

  const currentMetadata =
    (existingConversation.metadata as Record<string, unknown> | null | undefined) ?? {};
  const existingToken = getLiveChatToken(currentMetadata);

  if (
    existingToken &&
    input.reason === undefined &&
    input.summary === undefined &&
    input.status === undefined
  ) {
    return {
      id: existingConversation.id,
      status: null,
      liveChatToken: existingToken,
      metadata: currentMetadata,
    };
  }

  const liveChatToken = existingToken ?? generateLiveChatToken();

  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    escalationReason: input.reason ?? currentMetadata.escalationReason,
    escalationSummary: input.summary ?? currentMetadata.escalationSummary,
    escalatedAt:
      typeof currentMetadata.escalatedAt === "string"
        ? currentMetadata.escalatedAt
        : new Date().toISOString(),
    liveChatToken,
    liveChatInitializedAt: new Date().toISOString(),
    liveChatPhase: "waiting_for_join",
  };

  const [updated] = await db
    .update(chatConversation)
    .set({
      status: input.status ?? "escalated",
      metadata: nextMetadata,
      updatedAt: new Date(),
    })
    .where(eq(chatConversation.id, input.conversationId))
    .returning({
      id: chatConversation.id,
      metadata: chatConversation.metadata,
      status: chatConversation.status,
    });

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    status: updated.status,
    liveChatToken,
    metadata: (updated.metadata ?? {}) as Record<string, unknown>,
  };
}

export function broadcastConversationStatusUpdate(input: {
  conversationId: string;
  status: "opened" | "escalated" | "assigned" | "closed";
}) {
  const room = roomRegistry.get(input.conversationId);
  if (!room) {
    return;
  }

  handleConversationStatusLifecycle(room, input.status);
}

export async function getConversationByChatbotAndOrganization(input: {
  chatbotId: string;
  organizationId: string;
  userId?: string;
}) {
  const clauses = [
    eq(chatConversation.chatbotId, input.chatbotId),
    eq(chatConversation.organizationId, input.organizationId),
  ];

  if (input.userId) {
    clauses.push(eq(chatConversation.userId, input.userId));
  }

  const [conversation] = await db
    .select({
      id: chatConversation.id,
      userId: chatConversation.userId,
      status: chatConversation.status,
    })
    .from(chatConversation)
    .where(and(...clauses))
    .limit(1);

  return conversation ?? null;
}
