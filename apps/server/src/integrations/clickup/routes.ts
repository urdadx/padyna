import { db } from "@padyna/db";
import { agentAction, clickupIntegration } from "@padyna/db/schema/index";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleClickUpOAuthCallback } from "./auth/callback";
import {
  ClickUpApiError,
  createClickUpTask,
  getClickUpFolderlessLists,
  getClickUpFolders,
  getClickUpList,
  getClickUpSpaces,
  getClickUpWorkspaces,
} from "./auth/client";
import { createClickUpConnectUrl } from "./auth/connect";
import {
  getActiveClickUpIntegrationByChatbot,
  verifyActiveChatbotAccess,
  type ClickUpAuthContext,
} from "./utils";
import { clickupActionConfigSchema } from "../../actions/schema";
import { findEnabledPublicAction, publicActionRateLimit } from "../../lib/public-action-guard";

type Variables = {
  user: any;
  session: any;
};

const publicClickUpRoutes = new Hono();
const securedClickUpRoutes = new Hono<{ Variables: Variables }>();

securedClickUpRoutes.use(authMiddleware);

const createClickUpTaskBodySchema = z.object({
  chatbotId: z.uuid(),
  listId: z.string().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  markdownDescription: z.string().trim().min(1).optional(),
});

const createClickUpTaskFromActionBodySchema = z.object({
  actionId: z.uuid(),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(5000).optional(),
});

function getClickUpErrorStatusCode(statusCode?: number) {
  return statusCode === 400
    ? 400
    : statusCode === 401
      ? 401
      : statusCode === 403
        ? 403
        : statusCode === 404
          ? 404
          : statusCode === 409
            ? 409
            : statusCode === 422
              ? 422
              : statusCode === 429
                ? 429
                : 502;
}

async function resolveClickUpRequestContext(c: Context<{ Variables: Variables }>) {
  const user = c.get("user") as ClickUpAuthContext["user"];
  const session = c.get("session") as ClickUpAuthContext["session"];

  if (!user?.id) {
    return { response: c.json({ message: "Unauthorized" }, 401) };
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return { response: c.json({ message: "No active chatbot in your current organization" }, 400) };
  }

  const integration = await getActiveClickUpIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return {
      response: c.json({ message: "ClickUp is not connected for this chatbot" }, 404),
    };
  }

  return { access, integration };
}

async function resolvePublicClickUpTaskContext(
  c: Context,
  payload: z.infer<typeof createClickUpTaskBodySchema>,
) {
  const integration = await getActiveClickUpIntegrationByChatbot(payload.chatbotId);
  if (!integration) {
    return {
      response: c.json({ message: "ClickUp is not connected for this chatbot" }, 404),
    };
  }

  return { integration };
}

securedClickUpRoutes.get("/connect", async (c) => {
  try {
    return await createClickUpConnectUrl(c);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        {
          message: error.message,
          details: error.details,
        },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to start ClickUp OAuth flow" }, 502);
  }
});

securedClickUpRoutes.get("/status", async (c) => {
  const user = c.get("user") as ClickUpAuthContext["user"];
  const session = c.get("session") as ClickUpAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [integration] = await db
    .select({
      id: clickupIntegration.id,
      createdAt: clickupIntegration.createdAt,
      chatbotId: clickupIntegration.chatbotId,
      userId: clickupIntegration.userId,
      scope: clickupIntegration.scope,
      isActive: clickupIntegration.isActive,
      disconnectedAt: clickupIntegration.disconnectedAt,
      updatedAt: clickupIntegration.updatedAt,
    })
    .from(clickupIntegration)
    .where(eq(clickupIntegration.chatbotId, access.chatbotId))
    .limit(1);

  if (!integration) {
    return c.json({ connected: false, chatbotId: access.chatbotId, integration: null });
  }

  return c.json({
    connected: integration.isActive,
    chatbotId: access.chatbotId,
    integration,
  });
});

securedClickUpRoutes.delete("/disconnect", async (c) => {
  const user = c.get("user") as ClickUpAuthContext["user"];
  const session = c.get("session") as ClickUpAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [updated] = await db
    .update(clickupIntegration)
    .set({
      isActive: false,
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clickupIntegration.chatbotId, access.chatbotId),
        eq(clickupIntegration.isActive, true),
      ),
    )
    .returning({ id: clickupIntegration.id });

  return c.json({
    disconnected: Boolean(updated),
    chatbotId: access.chatbotId,
  });
});

securedClickUpRoutes.get("/workspaces", async (c) => {
  const resolved = await resolveClickUpRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  try {
    const workspaces = await getClickUpWorkspaces(resolved.integration.accessToken);
    return c.json(workspaces);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch ClickUp workspaces" }, 502);
  }
});

securedClickUpRoutes.get("/spaces", async (c) => {
  const resolved = await resolveClickUpRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) {
    return c.json({ message: "workspaceId is required" }, 400);
  }

  try {
    const spaces = await getClickUpSpaces({
      accessToken: resolved.integration.accessToken,
      workspaceId,
    });

    return c.json(spaces);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch ClickUp spaces" }, 502);
  }
});

securedClickUpRoutes.get("/folders", async (c) => {
  const resolved = await resolveClickUpRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const spaceId = c.req.query("spaceId");
  if (!spaceId) {
    return c.json({ message: "spaceId is required" }, 400);
  }

  try {
    const folders = await getClickUpFolders({
      accessToken: resolved.integration.accessToken,
      spaceId,
    });

    return c.json(folders);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch ClickUp folders" }, 502);
  }
});

securedClickUpRoutes.get("/lists", async (c) => {
  const resolved = await resolveClickUpRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const spaceId = c.req.query("spaceId");
  if (!spaceId) {
    return c.json({ message: "spaceId is required" }, 400);
  }

  try {
    const lists = await getClickUpFolderlessLists({
      accessToken: resolved.integration.accessToken,
      spaceId,
    });

    return c.json(lists);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch ClickUp folderless lists" }, 502);
  }
});

securedClickUpRoutes.get("/list", async (c) => {
  const resolved = await resolveClickUpRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const listId = c.req.query("listId");
  if (!listId) {
    return c.json({ message: "listId is required" }, 400);
  }

  try {
    const list = await getClickUpList({
      accessToken: resolved.integration.accessToken,
      listId,
    });

    return c.json(list);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch ClickUp list" }, 502);
  }
});

publicClickUpRoutes.post("/action-task", publicActionRateLimit, async (c) => {
  const parseResult = createClickUpTaskFromActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid ClickUp action task payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const payload = parseResult.data;
  const action = await findEnabledPublicAction(payload.actionId, "clickup");

  if (!action) {
    return c.json({ message: "ClickUp action not found" }, 404);
  }

  const config = clickupActionConfigSchema.parse(action.config);
  const resolved = await resolvePublicClickUpTaskContext(c, {
    chatbotId: action.chatbotId,
    listId: config.listId,
    name: payload.name,
    description: payload.description,
  });

  if ("response" in resolved) {
    return resolved.response;
  }

  try {
    const task = await createClickUpTask({
      accessToken: resolved.integration.accessToken,
      listId: config.listId,
      name: payload.name,
      description: payload.description,
    });

    await db
      .update(agentAction)
      .set({
        timesUsed: sql`${agentAction.timesUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(agentAction.id, action.id));

    return c.json({ task }, 201);
  } catch (error) {
    if (error instanceof ClickUpApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getClickUpErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to create ClickUp task" }, 502);
  }
});

export const clickupRoutes = new Hono();

clickupRoutes.get("/callback", handleClickUpOAuthCallback);
clickupRoutes.route("/", publicClickUpRoutes);
clickupRoutes.route("/", securedClickUpRoutes);
