export type LiveChatRole = "agent" | "visitor";

export type JoinLiveChatEvent = {
  type: "join";
  role: LiveChatRole;
  token?: string;
  userId?: string;
  userName?: string;
};

export type LiveChatMessageEvent = {
  type: "message";
  text: string;
};

export type LiveChatTypingEvent = {
  type: "typing";
  isTyping: boolean;
};

export type LiveChatClientEvent = JoinLiveChatEvent | LiveChatMessageEvent | LiveChatTypingEvent;

export type LiveChatRoomState = {
  conversationId: string;
  hasVisitor: boolean;
  hasAgent: boolean;
  visitorJoined: boolean;
  agentJoined: boolean;
  ready: boolean;
};

export type LiveChatServerEvent =
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
      type: "conversation_status_changed";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseLiveChatClientEvent(raw: string): LiveChatClientEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const type = parsed.type;

  if (type === "join") {
    const role = parsed.role;
    if (role !== "agent" && role !== "visitor") {
      return null;
    }

    return {
      type,
      role,
      token: asTrimmedString(parsed.token),
      userId: asTrimmedString(parsed.userId),
      userName: asTrimmedString(parsed.userName),
    };
  }

  if (type === "message") {
    const text = asTrimmedString(parsed.text);
    if (!text) {
      return null;
    }

    return {
      type,
      text,
    };
  }

  if (type === "typing") {
    if (typeof parsed.isTyping !== "boolean") {
      return null;
    }

    return {
      type,
      isTyping: parsed.isTyping,
    };
  }

  return null;
}

export function stringifyLiveChatServerEvent(event: LiveChatServerEvent): string {
  return JSON.stringify(event);
}
