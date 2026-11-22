import { db } from "@padyna/db";
import { jiraIntegration } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  JiraApiError,
  exchangeJiraAuthorizationCode,
  getJiraAccessibleResources,
  selectJiraAccessibleResource,
} from "./client";
import { consumeJiraOAuthState, getJiraCallbackUrl } from "../utils";
import { isOAuthStateOwner, OAUTH_STATE_OWNER_MESSAGE } from "../../oauth-state-owner";

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

export async function handleJiraOAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) {
    return c.json({ message: "Jira OAuth error", error: oauthError }, 400);
  }

  if (!code || !state) {
    return c.json({ message: "Missing code or state" }, 400);
  }

  const stateRecord = await consumeJiraOAuthState(state);
  if (!stateRecord) {
    return c.json({ message: "Invalid or expired OAuth state" }, 400);
  }

  if (!(await isOAuthStateOwner(c, stateRecord.userId))) {
    return c.json({ message: OAUTH_STATE_OWNER_MESSAGE }, 403);
  }

  try {
    const callbackUrl = getJiraCallbackUrl();
    const tokenResponse = await exchangeJiraAuthorizationCode({
      code,
      redirectUri: callbackUrl,
    });

    const accessibleResources = await getJiraAccessibleResources(tokenResponse.access_token);
    const jiraSite = selectJiraAccessibleResource(accessibleResources);

    if (!jiraSite) {
      return c.json({ message: "No Jira site was returned with the required scopes" }, 400);
    }

    const accessTokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    await db
      .insert(jiraIntegration)
      .values({
        userId: stateRecord.userId,
        chatbotId: stateRecord.chatbotId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        accessTokenExpiresAt,
        scope: tokenResponse.scope ?? jiraSite.scopes?.join(" ") ?? null,
        cloudId: jiraSite.id,
        siteUrl: jiraSite.url,
        siteName: jiraSite.name,
        siteAvatarUrl: jiraSite.avatarUrl ?? null,
        isActive: true,
        disconnectedAt: null,
      })
      .onConflictDoUpdate({
        target: jiraIntegration.chatbotId,
        set: {
          userId: stateRecord.userId,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token ?? null,
          accessTokenExpiresAt,
          scope: tokenResponse.scope ?? jiraSite.scopes?.join(" ") ?? null,
          cloudId: jiraSite.id,
          siteUrl: jiraSite.url,
          siteName: jiraSite.name,
          siteAvatarUrl: jiraSite.avatarUrl ?? null,
          isActive: true,
          disconnectedAt: null,
          updatedAt: new Date(),
        },
      });

    const [integration] = await db
      .select({ id: jiraIntegration.id })
      .from(jiraIntegration)
      .where(eq(jiraIntegration.chatbotId, stateRecord.chatbotId))
      .limit(1);

    return c.json({
      success: true,
      integrationId: integration?.id ?? null,
      chatbotId: stateRecord.chatbotId,
      cloudId: jiraSite.id,
      siteUrl: jiraSite.url,
      siteName: jiraSite.name,
    });
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

    return c.json({ message: "Failed to complete Jira OAuth flow" }, 502);
  }
}
