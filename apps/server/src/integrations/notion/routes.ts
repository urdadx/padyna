import { db } from "@padyna/db";
import { notionIntegration } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { ingestNotionPage } from "../../ingestion/notion";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleNotionOAuthCallback } from "./auth/callback";
import {
  NotionApiError,
  queryNotionDataSource,
  retrieveNotionPageMarkdown,
  searchNotionResources,
  toNotionSelectableResource,
} from "./auth/client";
import { createNotionConnectUrl } from "./auth/connect";
import {
  getActiveNotionIntegrationByChatbot,
  verifyActiveChatbotAccess,
  type NotionAuthContext,
} from "./utils";

type Variables = {
  user: any;
  session: any;
};

const securedNotionRoutes = new Hono<{ Variables: Variables }>();
securedNotionRoutes.use(authMiddleware);

const ingestNotionPagesBodySchema = z.object({
  pages: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().optional(),
        url: z.string().trim().optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

function getNotionErrorStatusCode(statusCode?: number) {
  return statusCode === 400
    ? 400
    : statusCode === 401
      ? 401
      : statusCode === 403
        ? 403
        : statusCode === 404
          ? 404
          : statusCode === 429
            ? 429
            : statusCode === 503
              ? 503
              : 502;
}

async function resolveNotionRequestContext(c: Context<{ Variables: Variables }>) {
  const user = c.get("user") as NotionAuthContext["user"];
  const session = c.get("session") as NotionAuthContext["session"];

  if (!user?.id) {
    return { response: c.json({ message: "Unauthorized" }, 401) };
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return { response: c.json({ message: "No active chatbot in your current organization" }, 400) };
  }

  const integration = await getActiveNotionIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return { response: c.json({ message: "Notion is not connected for this chatbot" }, 404) };
  }

  return { access, integration };
}

securedNotionRoutes.get("/connect", async (c) => {
  try {
    return await createNotionConnectUrl(c);
  } catch (error) {
    if (error instanceof NotionApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getNotionErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to start Notion OAuth flow" }, 502);
  }
});

securedNotionRoutes.get("/status", async (c) => {
  const user = c.get("user") as NotionAuthContext["user"];
  const session = c.get("session") as NotionAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [integration] = await db
    .select({
      id: notionIntegration.id,
      createdAt: notionIntegration.createdAt,
      chatbotId: notionIntegration.chatbotId,
      userId: notionIntegration.userId,
      botId: notionIntegration.botId,
      workspaceId: notionIntegration.workspaceId,
      workspaceName: notionIntegration.workspaceName,
      workspaceIcon: notionIntegration.workspaceIcon,
      isActive: notionIntegration.isActive,
      disconnectedAt: notionIntegration.disconnectedAt,
      updatedAt: notionIntegration.updatedAt,
    })
    .from(notionIntegration)
    .where(eq(notionIntegration.chatbotId, access.chatbotId))
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

securedNotionRoutes.delete("/disconnect", async (c) => {
  const user = c.get("user") as NotionAuthContext["user"];
  const session = c.get("session") as NotionAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [updated] = await db
    .update(notionIntegration)
    .set({
      isActive: false,
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(notionIntegration.chatbotId, access.chatbotId), eq(notionIntegration.isActive, true)),
    )
    .returning({ id: notionIntegration.id });

  return c.json({ disconnected: Boolean(updated), chatbotId: access.chatbotId });
});

securedNotionRoutes.get("/search", async (c) => {
  const resolved = await resolveNotionRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const query = c.req.query("query") ?? undefined;
  const cursor = c.req.query("cursor") ?? undefined;
  const object = c.req.query("object");
  const pageSize = Number(c.req.query("pageSize") ?? 50);

  if (object && object !== "page" && object !== "data_source") {
    return c.json({ message: "object must be page or data_source" }, 400);
  }

  try {
    const response = await searchNotionResources({
      accessToken: resolved.integration.accessToken,
      query,
      object: object as "page" | "data_source" | undefined,
      startCursor: cursor,
      pageSize: Number.isFinite(pageSize) ? pageSize : 50,
    });

    return c.json({
      results: response.results.map(toNotionSelectableResource),
      nextCursor: response.next_cursor,
      hasMore: response.has_more,
    });
  } catch (error) {
    if (error instanceof NotionApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getNotionErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to search Notion resources" }, 502);
  }
});

securedNotionRoutes.get("/data-sources/:dataSourceId/pages", async (c) => {
  const resolved = await resolveNotionRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const dataSourceId = c.req.param("dataSourceId");
  const cursor = c.req.query("cursor") ?? undefined;
  const resultType = c.req.query("resultType") ?? "page";
  const pageSize = Number(c.req.query("pageSize") ?? 50);

  if (resultType !== "page" && resultType !== "data_source") {
    return c.json({ message: "resultType must be page or data_source" }, 400);
  }

  try {
    const response = await queryNotionDataSource({
      accessToken: resolved.integration.accessToken,
      dataSourceId,
      startCursor: cursor,
      pageSize: Number.isFinite(pageSize) ? pageSize : 50,
      resultType,
    });

    return c.json({
      results: response.results.map(toNotionSelectableResource),
      nextCursor: response.next_cursor,
      hasMore: response.has_more,
    });
  } catch (error) {
    if (error instanceof NotionApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getNotionErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to query Notion data source" }, 502);
  }
});

securedNotionRoutes.post("/ingest", async (c) => {
  const resolved = await resolveNotionRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const parseResult = ingestNotionPagesBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      { message: "Invalid Notion ingestion payload", issues: z.treeifyError(parseResult.error) },
      400,
    );
  }

  const results = [];

  for (const page of parseResult.data.pages) {
    try {
      const markdown = await retrieveNotionPageMarkdown({
        accessToken: resolved.integration.accessToken,
        pageId: page.id,
      });

      results.push(
        await ingestNotionPage({
          pageId: page.id,
          title: page.title || "Untitled Notion page",
          markdown: markdown.markdown,
          chatbotId: resolved.access.chatbotId,
          organizationId: resolved.access.organizationId,
          workspaceId: resolved.integration.workspaceId,
          workspaceName: resolved.integration.workspaceName,
          url: page.url ?? null,
          truncated: markdown.truncated,
          unknownBlockIds: markdown.unknown_block_ids,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to ingest Notion page";
      results.push({
        pageId: page.id,
        datasourceId: "",
        status: "failed" as const,
        chunkCount: 0,
        message,
      });
    }
  }

  return c.json({ results });
});

export const notionRoutes = new Hono();

notionRoutes.get("/callback", handleNotionOAuthCallback);
notionRoutes.route("/", securedNotionRoutes);
