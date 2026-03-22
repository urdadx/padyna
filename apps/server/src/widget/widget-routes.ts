import { createAgentUIStreamResponse } from "ai";
import { db } from "@padyna/db";
import { chatbot } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createSupportChatAgent } from "../chat";

type PublicWidgetChatbot = {
  id: string;
  organizationId: string;
  name: string | null;
  image: string | null;
  primaryColor: string;
  hidePoweredBy: boolean;
  suggestedMessages: string[] | null;
  initialMessage: string;
  isEnabled: boolean;
  usecase: "support" | "technical" | "sales";
  allowedDomains: string[] | null;
};

export const widgetRoutes = new Hono();

function parseOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeAllowedDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = parseOrigin(trimmed);
  if (direct) {
    return direct;
  }

  return parseOrigin(`https://${trimmed}`);
}

function getRequestOrigin(c: any): string | null {
  const hostOrigin = parseOrigin(c.req.query("hostOrigin"));
  if (hostOrigin) {
    return hostOrigin;
  }

  const origin = parseOrigin(c.req.header("origin"));
  if (origin) {
    return origin;
  }

  return parseOrigin(c.req.header("referer"));
}

function isDomainAllowed(chatbotRecord: PublicWidgetChatbot, requestOrigin: string | null) {
  const allowed = (chatbotRecord.allowedDomains ?? [])
    .map(normalizeAllowedDomain)
    .filter((entry): entry is string => entry !== null);

  if (allowed.length === 0) {
    return true;
  }

  if (!requestOrigin) {
    return false;
  }

  return allowed.includes(requestOrigin);
}

async function getWidgetChatbot(widgetId: string) {
  const rows = await db
    .select({
      id: chatbot.id,
      organizationId: chatbot.organizationId,
      name: chatbot.name,
      image: chatbot.image,
      primaryColor: chatbot.primaryColor,
      hidePoweredBy: chatbot.hidePoweredBy,
      suggestedMessages: chatbot.suggestedMessages,
      initialMessage: chatbot.initialMessage,
      isEnabled: chatbot.isEnabled,
      usecase: chatbot.usecase,
      allowedDomains: chatbot.allowedDomains,
    })
    .from(chatbot)
    .where(eq(chatbot.embedToken, widgetId))
    .limit(1);

  return rows[0] as PublicWidgetChatbot | undefined;
}

widgetRoutes.get("/:widgetId/config", async (c) => {
  const widgetId = c.req.param("widgetId");
  const chatbotRecord = await getWidgetChatbot(widgetId);

  if (!chatbotRecord) {
    return c.json({ message: "Widget not found" }, 404);
  }

  if (!chatbotRecord.isEnabled) {
    return c.json({ message: "Widget is disabled" }, 403);
  }

  const requestOrigin = getRequestOrigin(c);
  if (!isDomainAllowed(chatbotRecord, requestOrigin)) {
    return c.json({ message: "Domain not allowed" }, 403);
  }

  return c.json({
    id: chatbotRecord.id,
    name: chatbotRecord.name,
    image: chatbotRecord.image,
    primaryColor: chatbotRecord.primaryColor,
    hidePoweredBy: chatbotRecord.hidePoweredBy,
    suggestedMessages: chatbotRecord.suggestedMessages ?? [],
    initialMessage: chatbotRecord.initialMessage,
  });
});

widgetRoutes.post("/:widgetId/chat", async (c) => {
  const widgetId = c.req.param("widgetId");
  const chatbotRecord = await getWidgetChatbot(widgetId);

  if (!chatbotRecord) {
    return c.json({ message: "Widget not found" }, 404);
  }

  if (!chatbotRecord.isEnabled) {
    return c.json({ message: "Widget is disabled" }, 403);
  }

  const requestOrigin = getRequestOrigin(c);
  if (!isDomainAllowed(chatbotRecord, requestOrigin)) {
    return c.json({ message: "Domain not allowed" }, 403);
  }

  const body = await c.req.json();
  const uiMessages = body.messages;

  if (!Array.isArray(uiMessages)) {
    return c.json({ message: "messages must be an array" }, 400);
  }

  const agent = createSupportChatAgent({
    chatbotId: chatbotRecord.id,
    organizationId: chatbotRecord.organizationId,
    chatbotName: chatbotRecord.name || "AI Assistant",
    chatbotUseCase: chatbotRecord.usecase || "support",
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages,
    originalMessages: uiMessages,
  });
});
