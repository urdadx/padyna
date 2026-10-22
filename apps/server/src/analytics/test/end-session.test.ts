import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import { createEndSessionRoute } from "../end-session-route";

// The route's job is parsing the beacon; ending the session is stubbed here.
const ended: unknown[] = [];
const endSessionRoute = createEndSessionRoute(async (input) => {
  ended.push(input);
  return true;
});

// Mounted exactly as in index.ts.
const app = new Hono().route("/api/analytics/session-end", endSessionRoute);

const SESSION_ID = "7f3c2a1e-4b5d-4c6e-9f80-000000000001";
const CHATBOT_ID = "7f3c2a1e-4b5d-4c6e-9f80-000000000002";

describe("session-end beacon route", () => {
  test("accepts the widget's beacon at /api/analytics/session-end", async () => {
    ended.length = 0;
    const body = new FormData();
    body.append("sessionId", SESSION_ID);
    body.append("chatbotId", CHATBOT_ID);
    body.append("durationMs", "4200");
    body.append("isBounce", "false");

    const response = await app.request("/api/analytics/session-end", { method: "POST", body });

    expect(response.status).toBe(200);
    expect(ended).toEqual([{ sessionId: SESSION_ID, chatbotId: CHATBOT_ID, durationMs: "4200", isBounce: false }]);
  });

  test("accepts JSON too", async () => {
    ended.length = 0;
    const response = await app.request("/api/analytics/session-end", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, chatbotId: CHATBOT_ID, isBounce: true }),
    });

    expect(response.status).toBe(200);
    expect(ended).toEqual([{ sessionId: SESSION_ID, chatbotId: CHATBOT_ID, durationMs: undefined, isBounce: true }]);
  });

  test("rejects missing or malformed ids without touching the database", async () => {
    ended.length = 0;
    const body = new FormData();
    body.append("sessionId", "not-a-uuid");
    body.append("chatbotId", CHATBOT_ID);

    const response = await app.request("/api/analytics/session-end", { method: "POST", body });

    expect(response.status).toBe(400);
    expect(ended).toEqual([]);
  });
});
