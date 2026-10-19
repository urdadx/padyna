import { db } from "@padyna/db";
import { agentAction } from "@padyna/db/schema/index";
import { Hono, type Context } from "hono";
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
import { getAgentActionById, listAgentActions } from "./db";
import {
  createCalendlyAgentActionBodySchema,
  createCalAgentActionBodySchema,
  createClickUpAgentActionBodySchema,
  createDiscordAgentActionBodySchema,
  createJiraAgentActionBodySchema,
  createSlackAgentActionBodySchema,
} from "./schema";
import { z } from "zod";
import type { ActionProvider } from "@padyna/api/actions/contracts";
import { and, eq } from "drizzle-orm";

type Variables = {
  user: any;
  session: any;
};

export const actionRoutes = new Hono<{ Variables: Variables }>();

actionRoutes.use(authMiddleware);

const actionIdParamSchema = z.object({
  actionId: z.uuid(),
});

const updateActionEnabledBodySchema = z.object({
  enabled: z.boolean(),
});

function getActionSchemaForProvider(provider: ActionProvider) {
  switch (provider) {
    case "jira":
      return createJiraAgentActionBodySchema;
    case "calendly":
      return createCalendlyAgentActionBodySchema;
    case "cal":
      return createCalAgentActionBodySchema;
    case "clickup":
      return createClickUpAgentActionBodySchema;
    case "discord":
      return createDiscordAgentActionBodySchema;
    case "slack":
      return createSlackAgentActionBodySchema;
  }

  throw new Error(`Unsupported action provider: ${provider}`);
}

async function ensureActionProviderConnection(provider: ActionProvider, chatbotId: string) {
  switch (provider) {
    case "jira":
      return Boolean(await getActiveJiraIntegrationByChatbot(chatbotId));
    case "calendly":
      return Boolean(await getActiveCalendlyIntegrationByChatbot(chatbotId));
    case "cal":
      return Boolean(process.env.CAL_API_KEY);
    case "clickup":
      return Boolean(await getActiveClickUpIntegrationByChatbot(chatbotId));
    case "discord":
      return Boolean(await getActiveDiscordConnectionByChatbot(chatbotId));
    case "slack":
      return Boolean(await getActiveSlackConnectionByChatbot(chatbotId));
  }

  throw new Error(`Unsupported action provider: ${provider}`);
}

function getMissingProviderConnectionMessage(provider: ActionProvider) {
  switch (provider) {
    case "jira":
      return "Jira is not connected for this chatbot";
    case "calendly":
      return "Calendly is not connected for this chatbot";
    case "cal":
      return "Cal.com API key not configured";
    case "clickup":
      return "ClickUp is not connected for this chatbot";
    case "discord":
      return "Discord is not connected for this chatbot";
    case "slack":
      return "Slack is not connected for this chatbot";
  }

  throw new Error(`Unsupported action provider: ${provider}`);
}

async function resolveActionRouteContext(c: Context<{ Variables: Variables }>) {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return { response: c.json({ message: "Unauthorized" }, 401) };
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return { response: c.json({ message: "No active chatbot in your current organization" }, 400) };
  }

  return { access };
}

actionRoutes.get("/", async (c) => {
  const resolved = await resolveActionRouteContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const actions = await listAgentActions(resolved.access);

  return c.json({ actions });
});

actionRoutes.get("/:actionId", async (c) => {
  const resolved = await resolveActionRouteContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const paramsResult = actionIdParamSchema.safeParse(c.req.param());
  if (!paramsResult.success) {
    return c.json(
      {
        message: "Invalid action id",
        issues: z.treeifyError(paramsResult.error),
      },
      400,
    );
  }

  const action = await getAgentActionById({
    actionId: paramsResult.data.actionId,
    chatbotId: resolved.access.chatbotId,
    organizationId: resolved.access.organizationId,
  });

  if (!action) {
    return c.json({ message: "Action not found" }, 404);
  }

  return c.json({ action });
});

actionRoutes.patch("/:actionId", async (c) => {
  const resolved = await resolveActionRouteContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const paramsResult = actionIdParamSchema.safeParse(c.req.param());
  if (!paramsResult.success) {
    return c.json(
      {
        message: "Invalid action id",
        issues: z.treeifyError(paramsResult.error),
      },
      400,
    );
  }

  const existingAction = await getAgentActionById({
    actionId: paramsResult.data.actionId,
    chatbotId: resolved.access.chatbotId,
    organizationId: resolved.access.organizationId,
  });

  if (!existingAction) {
    return c.json({ message: "Action not found" }, 404);
  }

  const schema = getActionSchemaForProvider(existingAction.provider);
  const parseResult = schema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: `Invalid ${existingAction.provider} action payload`,
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
      },
      400,
    );
  }

  const hasConnection = await ensureActionProviderConnection(
    existingAction.provider,
    resolved.access.chatbotId,
  );
  if (!hasConnection) {
    return c.json({ message: getMissingProviderConnectionMessage(existingAction.provider) }, 404);
  }

  const payload = parseResult.data;
  const [updated] = await db
    .update(agentAction)
    .set({
      name: payload.name,
      description: payload.description,
      enabled: payload.enabled,
      config: payload.config,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentAction.id, existingAction.id),
        eq(agentAction.chatbotId, resolved.access.chatbotId),
        eq(agentAction.organizationId, resolved.access.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return c.json({ message: "Action could not be updated" }, 404);
  }

  return c.json({ action: updated });
});

actionRoutes.patch("/:actionId/enabled", async (c) => {
  const resolved = await resolveActionRouteContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const paramsResult = actionIdParamSchema.safeParse(c.req.param());
  if (!paramsResult.success) {
    return c.json(
      {
        message: "Invalid action id",
        issues: z.treeifyError(paramsResult.error),
      },
      400,
    );
  }

  const bodyResult = updateActionEnabledBodySchema.safeParse(await c.req.json());
  if (!bodyResult.success) {
    return c.json(
      {
        message: "Invalid action status payload",
        issues: z.treeifyError(bodyResult.error),
      },
      400,
    );
  }

  const existingAction = await getAgentActionById({
    actionId: paramsResult.data.actionId,
    chatbotId: resolved.access.chatbotId,
    organizationId: resolved.access.organizationId,
  });

  if (!existingAction) {
    return c.json({ message: "Action not found" }, 404);
  }

  const [updated] = await db
    .update(agentAction)
    .set({
      enabled: bodyResult.data.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentAction.id, existingAction.id),
        eq(agentAction.chatbotId, resolved.access.chatbotId),
        eq(agentAction.organizationId, resolved.access.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return c.json({ message: "Action could not be updated" }, 404);
  }

  return c.json({ action: updated });
});

actionRoutes.delete("/:actionId", async (c) => {
  const resolved = await resolveActionRouteContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const paramsResult = actionIdParamSchema.safeParse(c.req.param());
  if (!paramsResult.success) {
    return c.json(
      {
        message: "Invalid action id",
        issues: z.treeifyError(paramsResult.error),
      },
      400,
    );
  }

  const existingAction = await getAgentActionById({
    actionId: paramsResult.data.actionId,
    chatbotId: resolved.access.chatbotId,
    organizationId: resolved.access.organizationId,
  });

  if (!existingAction) {
    return c.json({ message: "Action not found" }, 404);
  }

  const [deleted] = await db
    .delete(agentAction)
    .where(
      and(
        eq(agentAction.id, existingAction.id),
        eq(agentAction.chatbotId, resolved.access.chatbotId),
        eq(agentAction.organizationId, resolved.access.organizationId),
      ),
    )
    .returning({ id: agentAction.id });

  if (!deleted) {
    return c.json({ message: "Action could not be deleted" }, 404);
  }

  return c.json({ deleted: true, actionId: existingAction.id });
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
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
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
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
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

actionRoutes.post("/cal", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const parseResult = createCalAgentActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Cal action payload",
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
      },
      400,
    );
  }

  if (!process.env.CAL_API_KEY) {
    return c.json({ message: "Cal.com API key not configured" }, 404);
  }

  const payload = parseResult.data;
  const [created] = await db
    .insert(agentAction)
    .values({
      chatbotId: access.chatbotId,
      organizationId: access.organizationId,
      provider: "cal",
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
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
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
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
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
        // Each provider has its own schema; the error is the same shape for all of them.
        issues: z.treeifyError(parseResult.error as z.ZodError),
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
