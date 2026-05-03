import { db } from "@padyna/db";
import { notionIntegration } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { exchangeNotionAuthorizationCode, NotionApiError } from "./client";
import { consumeNotionOAuthState, getNotionCallbackUrl } from "../utils";

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
            : 502;
}

export async function handleNotionOAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) {
    return c.json({ message: "Notion OAuth error", error: oauthError }, 400);
  }

  if (!code || !state) {
    return c.json({ message: "Missing code or state" }, 400);
  }

  const stateRecord = await consumeNotionOAuthState(state);
  if (!stateRecord) {
    return c.json({ message: "Invalid or expired OAuth state" }, 400);
  }

  try {
    const tokenResponse = await exchangeNotionAuthorizationCode({
      code,
      redirectUri: getNotionCallbackUrl(),
    });

    await db
      .insert(notionIntegration)
      .values({
        userId: stateRecord.userId,
        chatbotId: stateRecord.chatbotId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        botId: tokenResponse.bot_id,
        workspaceId: tokenResponse.workspace_id,
        workspaceName: tokenResponse.workspace_name ?? null,
        workspaceIcon: tokenResponse.workspace_icon ?? null,
        duplicatedTemplateId: tokenResponse.duplicated_template_id ?? null,
        owner: tokenResponse.owner,
        isActive: true,
        disconnectedAt: null,
      })
      .onConflictDoUpdate({
        target: notionIntegration.chatbotId,
        set: {
          userId: stateRecord.userId,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          botId: tokenResponse.bot_id,
          workspaceId: tokenResponse.workspace_id,
          workspaceName: tokenResponse.workspace_name ?? null,
          workspaceIcon: tokenResponse.workspace_icon ?? null,
          duplicatedTemplateId: tokenResponse.duplicated_template_id ?? null,
          owner: tokenResponse.owner,
          isActive: true,
          disconnectedAt: null,
          updatedAt: new Date(),
        },
      });

    const [integration] = await db
      .select({ id: notionIntegration.id })
      .from(notionIntegration)
      .where(eq(notionIntegration.chatbotId, stateRecord.chatbotId))
      .limit(1);

    return c.json({
      success: true,
      integrationId: integration?.id ?? null,
      chatbotId: stateRecord.chatbotId,
      workspaceId: tokenResponse.workspace_id,
      workspaceName: tokenResponse.workspace_name ?? null,
    });
  } catch (error) {
    if (error instanceof NotionApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getNotionErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to complete Notion OAuth flow" }, 502);
  }
}
