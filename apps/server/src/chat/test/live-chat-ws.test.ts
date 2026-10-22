import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { websocket } from "hono/bun";

import { createLiveChatHub, type LiveChatStore } from "../live-chat-hub";
import { createLiveChatRoutes } from "../live-chat-ws";

// End to end over real Bun WebSockets: the route, Hono's adapter and the hub,
// with the database replaced by an in-memory store.

const conversation = {
  id: "conv-ws",
  chatbotId: "bot-1",
  organizationId: "org-1",
  status: "escalated",
  assignedTo: null as string | null,
  metadata: { liveChatToken: "visitor-token" },
};

const store: LiveChatStore = {
  getConversation: async () => ({ ...conversation }),
  authenticateAgent: async (headers) =>
    headers.get("x-test-agent") === "yes"
      ? { ok: true, userId: "agent-1", userName: "Maya" }
      : { ok: false, code: "UNAUTHORIZED", message: "Agent session is required." },
  saveMessage: async () => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
  assignAgent: async () => {},
  notify: async () => {},
};

const hub = createLiveChatHub(store, { logError: () => {} });
const app = new Hono().route("/api/live-chat", createLiveChatRoutes(hub));
let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({ port: 0, fetch: app.fetch, websocket });
});

afterAll(() => {
  server.stop(true);
});

type Client = { ws: WebSocket; events: any[]; next: (type: string) => Promise<any> };

async function open(headers: Record<string, string> = {}): Promise<Client> {
  // Bun's client accepts request headers, standing in for the browser's cookies.
  const ws = new WebSocket(`ws://localhost:${server.port}/api/live-chat/${conversation.id}/ws`, {
    headers,
  } as any);
  const events: any[] = [];
  const waiters: { type: string; resolve: (event: any) => void }[] = [];
  ws.onmessage = (message) => {
    const event = JSON.parse(String(message.data));
    events.push(event);
    const index = waiters.findIndex((waiter) => waiter.type === event.type);
    if (index !== -1) waiters.splice(index, 1)[0]!.resolve(event);
  };
  await new Promise((resolve) => (ws.onopen = resolve));
  const next = (type: string) =>
    new Promise<any>((resolve, reject) => {
      waiters.push({ type, resolve });
      setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), 2_000);
    });
  return { ws, events, next };
}

describe("live chat over WebSockets", () => {
  test("visitor and agent chat; an unauthenticated socket hears nothing", async () => {
    const visitor = await open();
    const agent = await open({ "x-test-agent": "yes" });
    const eavesdropper = await open();

    const visitorReady = visitor.next("state");
    visitor.ws.send(JSON.stringify({ type: "join", role: "visitor", token: "visitor-token" }));
    await visitorReady;

    const agentJoined = agent.next("state");
    agent.ws.send(JSON.stringify({ type: "join", role: "agent" }));
    expect((await agentJoined).state.ready).toBe(true);

    // Binary frames are decoded too.
    const delivered = agent.next("message");
    const echoed = visitor.next("message"); // the widget shows its own message from the echo
    visitor.ws.send(new TextEncoder().encode(JSON.stringify({ type: "message", text: "Hello?" })));
    expect((await delivered).message).toMatchObject({ role: "user", text: "Hello?" });
    expect((await echoed).message.id).toBe((await delivered).message.id);

    const reply = visitor.next("message");
    agent.ws.send(JSON.stringify({ type: "message", text: "Hi, Maya here" }));
    expect((await reply).message).toMatchObject({ role: "assistant", text: "Hi, Maya here" });

    await Bun.sleep(50);
    expect(eavesdropper.events.filter((event) => event.type === "message")).toHaveLength(0);

    // Closing the conversation reaches every socket, then closes it.
    const closed = new Promise<number>((resolve) => (eavesdropper.ws.onclose = (event) => resolve(event.code)));
    hub.broadcastConversationStatus({ conversationId: conversation.id, status: "closed" });
    expect(await closed).toBe(4004);
    expect(hub.stats()).toEqual({ connections: 0, rooms: 0 });
  });
});
