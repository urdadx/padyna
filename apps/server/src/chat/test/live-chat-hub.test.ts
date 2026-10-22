import { describe, expect, test } from "bun:test";

import {
  CLOSE_CODES,
  MAX_CONNECTIONS_PER_ROOM,
  MAX_LIVE_MESSAGE_LENGTH,
  createLiveChatHub,
  type AgentAuthResult,
  type ConversationMeta,
  type LiveChatStore,
} from "../live-chat-hub";

const CONVERSATION_ID = "conv-1";
const AGENT_HEADERS = new Headers({ cookie: "session=agent" });
const NO_HEADERS = new Headers();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function createFakeSocket() {
  const events: any[] = [];
  const socket = {
    events,
    closedWith: null as number | null,
    send: (data: string) => events.push(JSON.parse(data)),
    close: (code?: number) => {
      socket.closedWith = code ?? 1000;
    },
    ofType: (type: string) => events.filter((event) => event.type === type),
  };
  return socket;
}

function createFakeStore(overrides: Partial<LiveChatStore> = {}) {
  const conversation: ConversationMeta = {
    id: CONVERSATION_ID,
    chatbotId: "bot-1",
    organizationId: "org-1",
    status: "escalated",
    assignedTo: null,
    metadata: { liveChatToken: "visitor-token" },
  };
  const saved: { role: string; text: string }[] = [];
  const assigned: string[] = [];
  let nextId = 0;

  const store: LiveChatStore = {
    getConversation: async () => ({ ...conversation }),
    authenticateAgent: async (headers): Promise<AgentAuthResult> =>
      headers.get("cookie") === "session=agent"
        ? { ok: true, userId: "agent-1", userName: "Maya" }
        : { ok: false, code: "UNAUTHORIZED", message: "Agent session is required." },
    saveMessage: async ({ role, text }) => {
      saved.push({ role, text });
      return { id: `msg-${++nextId}`, createdAt: new Date(0).toISOString() };
    },
    assignAgent: async (_conversationId, userId) => {
      assigned.push(userId);
      conversation.status = "assigned";
      conversation.assignedTo = userId;
    },
    notify: async () => {},
    ...overrides,
  };

  return { store, conversation, saved, assigned };
}

function setup(overrides: Partial<LiveChatStore> = {}) {
  const fake = createFakeStore(overrides);
  let id = 0;
  const hub = createLiveChatHub(fake.store, { createId: () => `c${++id}`, logError: () => {} });

  const connect = (headers = NO_HEADERS) => {
    const ws = createFakeSocket();
    const connectionId = hub.registerConnection({ ws, conversationId: CONVERSATION_ID, headers });
    const emit = (event: unknown, eventHeaders = headers) =>
      hub.handleIncomingMessage({ connectionId: connectionId!, raw: JSON.stringify(event), headers: eventHeaders });
    return { ws, connectionId, emit };
  };

  /** A joined visitor and agent, with the join noise cleared. */
  const joinBoth = async () => {
    const visitor = connect();
    const agent = connect(AGENT_HEADERS);
    await visitor.emit({ type: "join", role: "visitor", token: "visitor-token" });
    await agent.emit({ type: "join", role: "agent" });
    visitor.ws.events.length = 0;
    agent.ws.events.length = 0;
    return { visitor, agent };
  };

  return { hub, connect, joinBoth, ...fake };
}

describe("live chat hub", () => {
  test("only the joined visitor and agent receive messages", async () => {
    const { connect, joinBoth, saved } = setup();
    const { visitor, agent } = await joinBoth();
    const eavesdropper = connect();
    eavesdropper.ws.events.length = 0;

    await visitor.emit({ type: "message", text: "I was charged twice" });

    expect(saved).toEqual([{ role: "user", text: "I was charged twice" }]);
    expect(visitor.ws.ofType("message")).toHaveLength(1);
    expect(agent.ws.ofType("message")[0].message).toMatchObject({ role: "user", text: "I was charged twice" });
    expect(eavesdropper.ws.ofType("message")).toHaveLength(0);
  });

  test("signed-in dashboard members can observe without joining", async () => {
    const { connect, joinBoth } = setup();
    const { visitor } = await joinBoth();
    const observer = connect(AGENT_HEADERS);
    await Bun.sleep(0); // observer verification is asynchronous

    await visitor.emit({ type: "message", text: "hello" });

    expect(observer.ws.ofType("message")).toHaveLength(1);
  });

  test("rejects a visitor with the wrong token", async () => {
    const { connect } = setup();
    const visitor = connect();

    await visitor.emit({ type: "join", role: "visitor", token: "guess" });

    expect(visitor.ws.ofType("error")[0].code).toBe("FORBIDDEN");
    expect(visitor.ws.closedWith).toBe(CLOSE_CODES.forbidden);
  });

  test("a socket that closes mid-join never becomes a participant", async () => {
    const auth = deferred<AgentAuthResult>();
    const { hub, connect, assigned } = setup({ authenticateAgent: () => auth.promise });
    const visitor = connect();
    await visitor.emit({ type: "join", role: "visitor", token: "visitor-token" });
    const agent = connect(AGENT_HEADERS);

    const joining = agent.emit({ type: "join", role: "agent" });
    hub.unregisterConnection(agent.connectionId!);
    auth.resolve({ ok: true, userId: "agent-1", userName: "Maya" });
    await joining;

    expect(assigned).toEqual([]);
    expect(visitor.ws.ofType("state").at(-1).state).toMatchObject({ agentJoined: false, ready: false });
    expect(hub.stats()).toEqual({ connections: 1, rooms: 1 });
  });

  test("messages from one socket are delivered in the order they were sent", async () => {
    const firstSave = deferred<void>();
    let calls = 0;
    const { joinBoth } = setup({
      saveMessage: async ({ text }) => {
        if (++calls === 1) await firstSave.promise;
        return { id: text, createdAt: new Date(0).toISOString() };
      },
    });
    const { visitor, agent } = await joinBoth();

    const first = visitor.emit({ type: "message", text: "first" });
    const second = visitor.emit({ type: "message", text: "second" });
    firstSave.resolve();
    await Promise.all([first, second]);

    expect(agent.ws.ofType("message").map((event) => event.message.text)).toEqual(["first", "second"]);
  });

  test("typing changes reach the other side once", async () => {
    const { joinBoth } = setup();
    const { visitor, agent } = await joinBoth();

    await visitor.emit({ type: "typing", isTyping: true });
    await visitor.emit({ type: "typing", isTyping: true });
    await visitor.emit({ type: "typing", isTyping: false });

    expect(agent.ws.ofType("typing").map((event) => event.isTyping)).toEqual([true, false]);
    expect(visitor.ws.ofType("typing")).toHaveLength(0);
  });

  test("closing the conversation tells everyone, then closes every socket", async () => {
    const { hub, connect, joinBoth } = setup();
    const { visitor, agent } = await joinBoth();
    const widget = connect();

    hub.broadcastConversationStatus({ conversationId: CONVERSATION_ID, status: "closed" });

    for (const { ws } of [visitor, agent, widget]) {
      expect(ws.ofType("conversation_status_changed").at(-1).status).toBe("closed");
      expect(ws.closedWith).toBe(CLOSE_CODES.conversationClosed);
    }
    expect(hub.stats()).toEqual({ connections: 0, rooms: 0 });
  });

  test("an agent rejoining an assignment they already hold skips the database write", async () => {
    const { connect, joinBoth, assigned } = setup();
    await joinBoth();
    const secondTab = connect(AGENT_HEADERS);

    await secondTab.emit({ type: "join", role: "agent" });

    expect(assigned).toEqual(["agent-1"]);
  });

  test("a new socket gets the room state; existing sockets are not re-notified", async () => {
    const { connect, joinBoth } = setup();
    const { visitor } = await joinBoth();
    const widget = connect();

    expect(widget.ws.ofType("state")[0].state).toMatchObject({ ready: true });
    expect(visitor.ws.ofType("state")).toHaveLength(0);
  });

  test("caps the sockets per conversation", () => {
    const { connect } = setup();
    for (let i = 0; i < MAX_CONNECTIONS_PER_ROOM; i++) connect();

    const overflow = connect();

    expect(overflow.connectionId).toBeNull();
    expect(overflow.ws.closedWith).toBe(CLOSE_CODES.tryAgainLater);
  });

  test("rejects messages over the length limit", async () => {
    const { joinBoth, saved } = setup();
    const { visitor } = await joinBoth();

    await visitor.emit({ type: "message", text: "x".repeat(MAX_LIVE_MESSAGE_LENGTH + 1) });

    expect(visitor.ws.ofType("error")[0].code).toBe("MESSAGE_TOO_LONG");
    expect(saved).toEqual([]);
  });

  test("a failed save reports an error instead of throwing", async () => {
    const { joinBoth } = setup({
      saveMessage: async () => {
        throw new Error("database down");
      },
    });
    const { visitor, agent } = await joinBoth();

    await visitor.emit({ type: "message", text: "hello" });

    expect(visitor.ws.ofType("error")[0].code).toBe("INTERNAL");
    expect(agent.ws.ofType("message")).toHaveLength(0);
  });
});
