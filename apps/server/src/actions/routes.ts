import { db } from "@padyna/db";
import { agentAction } from "@padyna/db/schema/index";
import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth-middleware";
import {
  getActiveCalendlyIntegrationByChatbot,
  type CalendlyAuthContext,
} from "../integrations/calendly/utils";
import {
  getActiveJiraIntegrationByChatbot,
  verifyActiveChatbotAccess,
  type JiraAuthContext,
} from "../integrations/jira/utils";
import { getActiveClickUpIntegrationByChatbot } from "../integrations/clickup/utils";
import { getActiveDiscordConnectionByChatbot } from "../integrations/discord/utils";
import { getActiveSlackConnectionByChatbot } from "../integrations/slack/utils";
import { listAgentActions } from "./db";
import {
  createCalendlyAgentActionBodySchema,
  createClickUpAgentActionBodySchema,
  createDiscordAgentActionBodySchema,
  createJiraAgentActionBodySchema,
  createSlackAgentActionBodySchema,
} from "./schema";
import { z } from "zod";

type Variables = {
  user: any;
  session: any;
};

export const actionRoutes = new Hono<{ Variables: Variables }>();

actionRoutes.use(authMiddleware);

actionRoutes.get("/", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const actions = await listAgentActions(access);

  return c.json({ actions });
});

actionRoutes.post("/jira", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const parseResult = createJiraAgentActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Jira action payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const integration = await getActiveJiraIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return c.json({ message: "Jira is not connected for this chatbot" }, 404);
  }

  const payload = parseResult.data;
  const [created] = await db
    .insert(agentAction)
    .values({
      chatbotId: access.chatbotId,
      organizationId: access.organizationId,
      provider: "jira",
      name: payload.name,
      description: payload.description,
      enabled: payload.enabled,
      config: payload.config,
    })
    .returning();

  return c.json({ action: created }, 201);
});

actionRoutes.post("/calendly", async (c) => {
  const user = c.get("user") as CalendlyAuthContext["user"];
  const session = c.get("session") as CalendlyAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const parseResult = createCalendlyAgentActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Calendly action payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const integration = await getActiveCalendlyIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return c.json({ message: "Calendly is not connected for this chatbot" }, 404);
  }

  const payload = parseResult.data;
  const [created] = await db
    .insert(agentAction)
    .values({
      chatbotId: access.chatbotId,
      organizationId: access.organizationId,
      provider: "calendly",
      name: payload.name,
      description: payload.description,
      enabled: payload.enabled,
      config: payload.config,
    })
    .returning();

  return c.json({ action: created }, 201);
});

actionRoutes.post("/clickup", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const parseResult = createClickUpAgentActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid ClickUp action payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const integration = await getActiveClickUpIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return c.json({ message: "ClickUp is not connected for this chatbot" }, 404);
  }

  const payload = parseResult.data;
  const [created] = await db
    .insert(agentAction)
    .values({
      chatbotId: access.chatbotId,
      organizationId: access.organizationId,
      provider: "clickup",
      name: payload.name,
      description: payload.description,
      enabled: payload.enabled,
      config: payload.config,
    })
    .returning();

  return c.json({ action: created }, 201);
});

actionRoutes.post("/discord", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const parseResult = createDiscordAgentActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Discord action payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const connection = await getActiveDiscordConnectionByChatbot(access.chatbotId);
  if (!connection) {
    return c.json({ message: "Discord is not connected for this chatbot" }, 404);
  }

  const payload = parseResult.data;
  const [created] = await db
    .insert(agentAction)
    .values({
      chatbotId: access.chatbotId,
      organizationId: access.organizationId,
      provider: "discord",
      name: payload.name,
      description: payload.description,
      enabled: payload.enabled,
      config: payload.config,
    })
    .returning();

  return c.json({ action: created }, 201);
});

actionRoutes.post("/slack", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const parseResult = createSlackAgentActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Slack action payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const connection = await getActiveSlackConnectionByChatbot(access.chatbotId);
  if (!connection) {
    return c.json({ message: "Slack is not connected for this chatbot" }, 404);
  }

  const payload = parseResult.data;
  const [created] = await db
    .insert(agentAction)
    .values({
      chatbotId: access.chatbotId,
      organizationId: access.organizationId,
      provider: "slack",
      name: payload.name,
      description: payload.description,
      enabled: payload.enabled,
      config: payload.config,
    })
    .returning();

  return c.json({ action: created }, 201);
});
