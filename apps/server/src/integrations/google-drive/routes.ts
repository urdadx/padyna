import { db } from "@padyna/db";
import { googleDriveIntegration } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { ingestGoogleDriveFile } from "../../ingestion/google-drive";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleGoogleDriveOAuthCallback } from "./auth/callback";
import {
  downloadGoogleDriveFile,
  getGoogleDriveFile,
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  GoogleDriveApiError,
  isSupportedGoogleDriveFile,
  listGoogleDriveFiles,
  refreshGoogleDriveAccessToken,
  type GoogleDriveFile,
} from "./auth/client";
import { createGoogleDriveConnectUrl } from "./auth/connect";
import {
  getActiveGoogleDriveIntegrationByChatbot,
  verifyActiveChatbotAccess,
  type GoogleDriveAuthContext,
} from "./utils";

type Variables = {
  user: any;
  session: any;
};

const securedGoogleDriveRoutes = new Hono<{ Variables: Variables }>();
securedGoogleDriveRoutes.use(authMiddleware);

const ingestGoogleDriveBodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum(["file", "folder"]),
      }),
    )
    .min(1)
    .max(50),
});

function getGoogleDriveErrorStatusCode(statusCode?: number) {
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
            : 502;
}

async function resolveGoogleDriveRequestContext(c: Context<{ Variables: Variables }>) {
  const user = c.get("user") as GoogleDriveAuthContext["user"];
  const session = c.get("session") as GoogleDriveAuthContext["session"];

  if (!user?.id) {
    return { response: c.json({ message: "Unauthorized" }, 401) };
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return { response: c.json({ message: "No active chatbot in your current organization" }, 400) };
  }

  const integration = await getActiveGoogleDriveIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return { response: c.json({ message: "Google Drive is not connected for this chatbot" }, 404) };
  }

  return { access, integration };
}

async function getAccessToken(integration: typeof googleDriveIntegration.$inferSelect) {
  const expiresAt = integration.expiresAt?.getTime();
  const shouldRefresh = expiresAt ? expiresAt - Date.now() < 60_000 : false;

  if (!shouldRefresh) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    return integration.accessToken;
  }

  const tokenResponse = await refreshGoogleDriveAccessToken(integration.refreshToken);
  await db
    .update(googleDriveIntegration)
    .set({
      accessToken: tokenResponse.access_token,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null,
      scope: tokenResponse.scope ?? integration.scope,
      tokenType: tokenResponse.token_type ?? integration.tokenType,
      updatedAt: new Date(),
    })
    .where(eq(googleDriveIntegration.id, integration.id));

  return tokenResponse.access_token;
}

function toSelectableResource(file: GoogleDriveFile) {
  const isFolder = file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE;
  return {
    id: file.id,
    object: isFolder ? "folder" : "file",
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime ?? null,
    url: file.webViewLink ?? null,
    size: file.size ? Number(file.size) : null,
    parents: file.parents ?? [],
  };
}

async function collectFolderFiles(args: {
  accessToken: string;
  folderId: string;
  output: Map<string, GoogleDriveFile>;
  visitedFolderIds: Set<string>;
}) {
  if (args.visitedFolderIds.has(args.folderId) || args.output.size >= 200) {
    return;
  }

  args.visitedFolderIds.add(args.folderId);
  let pageToken: string | undefined;

  do {
    const response = await listGoogleDriveFiles({
      accessToken: args.accessToken,
      folderId: args.folderId,
      pageToken,
      pageSize: 100,
    });

    for (const file of response.files) {
      if (file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        await collectFolderFiles({
          accessToken: args.accessToken,
          folderId: file.id,
          output: args.output,
          visitedFolderIds: args.visitedFolderIds,
        });
      } else if (isSupportedGoogleDriveFile(file)) {
        args.output.set(file.id, file);
      }

      if (args.output.size >= 200) {
        return;
      }
    }

    pageToken = response.nextPageToken ?? undefined;
  } while (pageToken);
}

securedGoogleDriveRoutes.get("/connect", async (c) => {
  try {
    return await createGoogleDriveConnectUrl(c);
  } catch (error) {
    if (error instanceof GoogleDriveApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getGoogleDriveErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to start Google Drive OAuth flow" }, 502);
  }
});

securedGoogleDriveRoutes.get("/status", async (c) => {
  const user = c.get("user") as GoogleDriveAuthContext["user"];
  const session = c.get("session") as GoogleDriveAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [integration] = await db
    .select({
      id: googleDriveIntegration.id,
      chatbotId: googleDriveIntegration.chatbotId,
      userId: googleDriveIntegration.userId,
      accountId: googleDriveIntegration.accountId,
      accountEmail: googleDriveIntegration.accountEmail,
      accountName: googleDriveIntegration.accountName,
      accountPicture: googleDriveIntegration.accountPicture,
      isActive: googleDriveIntegration.isActive,
      disconnectedAt: googleDriveIntegration.disconnectedAt,
      createdAt: googleDriveIntegration.createdAt,
      updatedAt: googleDriveIntegration.updatedAt,
    })
    .from(googleDriveIntegration)
    .where(eq(googleDriveIntegration.chatbotId, access.chatbotId))
    .limit(1);

  if (!integration) {
    return c.json({ connected: false, chatbotId: access.chatbotId, integration: null });
  }

  return c.json({ connected: integration.isActive, chatbotId: access.chatbotId, integration });
});

securedGoogleDriveRoutes.delete("/disconnect", async (c) => {
  const user = c.get("user") as GoogleDriveAuthContext["user"];
  const session = c.get("session") as GoogleDriveAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [updated] = await db
    .update(googleDriveIntegration)
    .set({ isActive: false, disconnectedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(googleDriveIntegration.chatbotId, access.chatbotId),
        eq(googleDriveIntegration.isActive, true),
      ),
    )
    .returning({ id: googleDriveIntegration.id });

  return c.json({ disconnected: Boolean(updated), chatbotId: access.chatbotId });
});

securedGoogleDriveRoutes.get("/files", async (c) => {
  const resolved = await resolveGoogleDriveRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const folderId = c.req.query("folderId") ?? (c.req.query("query") ? undefined : "root");
  const query = c.req.query("query") ?? undefined;
  const pageToken = c.req.query("pageToken") ?? undefined;
  const pageSize = Number(c.req.query("pageSize") ?? 100);

  try {
    const accessToken = await getAccessToken(resolved.integration);
    const response = await listGoogleDriveFiles({
      accessToken,
      folderId,
      query,
      pageToken,
      pageSize: Number.isFinite(pageSize) ? pageSize : 100,
    });

    return c.json({
      results: response.files.map(toSelectableResource),
      nextPageToken: response.nextPageToken ?? null,
      hasMore: Boolean(response.nextPageToken),
    });
  } catch (error) {
    if (error instanceof GoogleDriveApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getGoogleDriveErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to list Google Drive files" }, 502);
  }
});

securedGoogleDriveRoutes.post("/ingest", async (c) => {
  const resolved = await resolveGoogleDriveRequestContext(c);
  if ("response" in resolved) {
    return resolved.response;
  }

  const parseResult = ingestGoogleDriveBodySchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json(
      {
        message: "Invalid Google Drive ingestion payload",
        issues: z.treeifyError(parseResult.error),
      },
      400,
    );
  }

  try {
    const accessToken = await getAccessToken(resolved.integration);
    const files = new Map<string, GoogleDriveFile>();

    for (const item of parseResult.data.items) {
      const file = await getGoogleDriveFile({ accessToken, fileId: item.id });

      if (item.type === "folder" || file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        await collectFolderFiles({
          accessToken,
          folderId: file.id,
          output: files,
          visitedFolderIds: new Set(),
        });
      } else if (isSupportedGoogleDriveFile(file)) {
        files.set(file.id, file);
      }
    }

    const results = [];
    for (const file of files.values()) {
      const content = await downloadGoogleDriveFile({ accessToken, file });
      results.push(
        await ingestGoogleDriveFile({
          file,
          content,
          chatbotId: resolved.access.chatbotId,
          organizationId: resolved.access.organizationId,
          accountId: resolved.integration.accountId,
          accountEmail: resolved.integration.accountEmail,
        }),
      );
    }

    return c.json({ results });
  } catch (error) {
    if (error instanceof GoogleDriveApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getGoogleDriveErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to ingest Google Drive files" }, 502);
  }
});

export const googleDriveRoutes = new Hono();

googleDriveRoutes.get("/callback", handleGoogleDriveOAuthCallback);
googleDriveRoutes.route("/", securedGoogleDriveRoutes);
