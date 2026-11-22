import { db } from "@padyna/db";
import { agentAction, jiraIntegration } from "@padyna/db/schema/index";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleJiraOAuthCallback } from "./auth/callback";
import {
  JiraApiError,
  createJiraIssue,
  getJiraCreateMetaIssueTypes,
  getJiraIssueTypes,
  getJiraProjects,
} from "./auth/client";
import { createJiraConnectUrl } from "./auth/connect";
import { jiraActionConfigSchema } from "../../actions/schema";
import { findEnabledPublicAction, publicActionRateLimit } from "../../lib/public-action-guard";
import {
  getActiveJiraIntegrationByChatbot,
  isJiraAccessTokenExpired,
  refreshJiraAccessTokenIfNeeded,
  verifyActiveChatbotAccess,
  type JiraAuthContext,
} from "./utils";

type Variables = {
  user: any;
  session: any;
};

const publicJiraRoutes = new Hono();
const securedJiraRoutes = new Hono<{ Variables: Variables }>();
securedJiraRoutes.use(authMiddleware);

const createJiraIssueBodySchema = z.object({
  chatbotId: z.uuid(),
  projectId: z.string().min(1),
  issueTypeId: z.string().min(1),
  summary: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  priorityId: z.string().min(1).optional(),
});

const createJiraIssueFromActionBodySchema = z.object({
  actionId: z.uuid(),
  summary: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(5000).optional(),
});

function getJiraErrorStatusCode(statusCode?: number) {
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

async function resolveJiraRequestContext(c: Context<{ Variables: Variables }>) {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return { response: c.json({ message: "Unauthorized" }, 401) };
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return { response: c.json({ message: "No active chatbot in your current organization" }, 400) };
  }

  const integration = await getActiveJiraIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return {
      response: c.json({ message: "Jira is not connected for this chatbot" }, 404),
    };
  }

  let usableIntegration = integration;

  try {
    usableIntegration = await refreshJiraAccessTokenIfNeeded(integration);
  } catch (error) {
    if (error instanceof JiraApiError) {
      return {
        response: c.json(
          {
            message: "Jira connection expired. Reconnect the integration.",
            details: error.details,
          },
          401,
        ),
      };
    }

    return {
      response: c.json({ message: "Failed to refresh Jira connection" }, 502),
    };
  }

  if (isJiraAccessTokenExpired(usableIntegration)) {
    return {
      response: c.json({ message: "Jira connection expired. Reconnect the integration." }, 401),
    };
  }

  return { access, integration: usableIntegration };
}

async function resolvePublicJiraIssueContext(
  c: Context,
  payload: z.infer<typeof createJiraIssueBodySchema>,
) {
  const integration = await getActiveJiraIntegrationByChatbot(payload.chatbotId);
  if (!integration) {
    return {
      response: c.json({ message: "Jira is not connected for this chatbot" }, 404),
    };
  }

  try {
    const usableIntegration = await refreshJiraAccessTokenIfNeeded(integration);

    if (isJiraAccessTokenExpired(usableIntegration)) {
      return {
        response: c.json({ message: "Jira connection expired. Reconnect the integration." }, 401),
      };
    }

    return { integration: usableIntegration };
  } catch (error) {
    if (error instanceof JiraApiError) {
      return {
        response: c.json(
          {
            message: "Jira connection expired. Reconnect the integration.",
            details: error.details,
          },
          401,
        ),
      };
    }

    return {
      response: c.json({ message: "Failed to refresh Jira connection" }, 502),
    };
  }
}

securedJiraRoutes.get("/connect", async (c) => {
  try {
    return await createJiraConnectUrl(c);
  } catch (error) {
    if (error instanceof JiraApiError) {
      return c.json(
        {
          message: error.message,
          details: error.details,
        },
        getJiraErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to start Jira OAuth flow" }, 502);
  }
});

securedJiraRoutes.get("/status", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [integration] = await db
    .select({
      id: jiraIntegration.id,
      createdAt: jiraIntegration.createdAt,
      chatbotId: jiraIntegration.chatbotId,
      userId: jiraIntegration.userId,
      accessToken: jiraIntegration.accessToken,
      refreshToken: jiraIntegration.refreshToken,
      accessTokenExpiresAt: jiraIntegration.accessTokenExpiresAt,
      scope: jiraIntegration.scope,
      cloudId: jiraIntegration.cloudId,
      siteUrl: jiraIntegration.siteUrl,
      siteName: jiraIntegration.siteName,
      siteAvatarUrl: jiraIntegration.siteAvatarUrl,
      isActive: jiraIntegration.isActive,
      disconnectedAt: jiraIntegration.disconnectedAt,
      updatedAt: jiraIntegration.updatedAt,
    })
    .from(jiraIntegration)
    .where(eq(jiraIntegration.chatbotId, access.chatbotId))
    .limit(1);

  if (!integration) {
    return c.json({ connected: false, chatbotId: access.chatbotId, integration: null });
  }

  let usableIntegration = integration;

  try {
    usableIntegration = await refreshJiraAccessTokenIfNeeded(integration);
  } catch (error) {
    if (error instanceof JiraApiError) {
      return c.json(
        {
          connected: true,
          chatbotId: access.chatbotId,
          // The same public fields as the success response: never the tokens.
          integration: {
            id: integration.id,
            chatbotId: integration.chatbotId,
            userId: integration.userId,
            accessTokenExpiresAt: integration.accessTokenExpiresAt,
            scope: integration.scope,
            cloudId: integration.cloudId,
            siteUrl: integration.siteUrl,
            siteName: integration.siteName,
            siteAvatarUrl: integration.siteAvatarUrl,
            isActive: integration.isActive,
            disconnectedAt: integration.disconnectedAt,
            updatedAt: integration.updatedAt,
            tokenExpired: true,
            canRefresh: Boolean(integration.refreshToken),
          },
          message: "Jira connection expired. Reconnect the integration.",
          details: error.details,
        },
        401,
      );
    }

    return c.json({ message: "Failed to refresh Jira connection" }, 502);
  }

  return c.json({
    connected: usableIntegration.isActive,
    chatbotId: access.chatbotId,
    integration: {
      id: usableIntegration.id,
      chatbotId: usableIntegration.chatbotId,
      userId: usableIntegration.userId,
      accessTokenExpiresAt: usableIntegration.accessTokenExpiresAt,
      scope: usableIntegration.scope,
      cloudId: usableIntegration.cloudId,
      siteUrl: usableIntegration.siteUrl,
      siteName: usableIntegration.siteName,
      siteAvatarUrl: usableIntegration.siteAvatarUrl,
      isActive: usableIntegration.isActive,
      disconnectedAt: usableIntegration.disconnectedAt,
      updatedAt: usableIntegration.updatedAt,
      tokenExpired: isJiraAccessTokenExpired(usableIntegration),
      canRefresh: Boolean(usableIntegration.refreshToken),
    },
  });
});

securedJiraRoutes.delete("/disconnect", async (c) => {
  const user = c.get("user") as JiraAuthContext["user"];
  const session = c.get("session") as JiraAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [updated] = await db
    .update(jiraIntegration)
    .set({
      isActive: false,
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(jiraIntegration.chatbotId, access.chatbotId), eq(jiraIntegration.isActive, true)))
    .returning({ id: jiraIntegration.id });

  return c.json({
    disconnected: Boolean(updated),
    chatbotId: access.chatbotId,
  });
});

securedJiraRoutes.get("/projects", async (c) => {
  const resolved = await resolveJiraRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const startAt = c.req.query("startAt");
  const maxResults = c.req.query("maxResults");
  const query = c.req.query("query") ?? undefined;

  try {
    const projects = await getJiraProjects({
      accessToken: resolved.integration.accessToken,
      cloudId: resolved.integration.cloudId,
      startAt: startAt ? Number(startAt) : undefined,
      maxResults: maxResults ? Number(maxResults) : undefined,
      query,
    });

    return c.json(projects);
  } catch (error) {
    if (error instanceof JiraApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getJiraErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch Jira projects" }, 502);
  }
});

securedJiraRoutes.get("/issue-types", async (c) => {
  const resolved = await resolveJiraRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const projectId = c.req.query("projectId");
  if (!projectId) {
    return c.json({ message: "projectId is required" }, 400);
  }

  try {
    const issueTypes = await getJiraIssueTypes({
      accessToken: resolved.integration.accessToken,
      cloudId: resolved.integration.cloudId,
      projectId,
    });

    return c.json(issueTypes);
  } catch (error) {
    if (error instanceof JiraApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getJiraErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch Jira issue types" }, 502);
  }
});

securedJiraRoutes.get("/fields", async (c) => {
  const resolved = await resolveJiraRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const projectIdOrKey = c.req.query("projectIdOrKey") ?? c.req.query("projectKey");
  if (!projectIdOrKey) {
    return c.json({ message: "projectIdOrKey is required" }, 400);
  }

  try {
    const createMetadata = await getJiraCreateMetaIssueTypes({
      accessToken: resolved.integration.accessToken,
      cloudId: resolved.integration.cloudId,
      projectIdOrKey,
    });

    return c.json(createMetadata);
  } catch (error) {
    if (error instanceof JiraApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getJiraErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to fetch Jira create metadata" }, 502);
  }
});

publicJiraRoutes.post("/action-issue", publicActionRateLimit, async (c) => {
  const parseResult = createJiraIssueFromActionBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Jira action issue payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  const payload = parseResult.data;
  const action = await findEnabledPublicAction(payload.actionId, "jira");

  if (!action) {
    return c.json({ message: "Jira action not found" }, 404);
  }

  const config = jiraActionConfigSchema.parse(action.config);
  const resolved = await resolvePublicJiraIssueContext(c, {
    chatbotId: action.chatbotId,
    projectId: config.projectId,
    issueTypeId: config.issueTypeId,
    summary: payload.summary,
    description: payload.description,
  });

  if ("response" in resolved) {
    return resolved.response;
  }

  try {
    const issue = await createJiraIssue({
      accessToken: resolved.integration.accessToken,
      cloudId: resolved.integration.cloudId,
      projectId: config.projectId,
      issueTypeId: config.issueTypeId,
      summary: payload.summary,
      description: payload.description,
    });

    await db
      .update(agentAction)
      .set({
        timesUsed: sql`${agentAction.timesUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(agentAction.id, action.id));

    return c.json(
      {
        issue,
        issueUrl: `${resolved.integration.siteUrl}/browse/${issue.key}`,
      },
      201,
    );
  } catch (error) {
    if (error instanceof JiraApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getJiraErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to create Jira issue" }, 502);
  }
});

export const jiraRoutes = new Hono();

jiraRoutes.get("/callback", handleJiraOAuthCallback);
jiraRoutes.route("/", publicJiraRoutes);
jiraRoutes.route("/", securedJiraRoutes);
