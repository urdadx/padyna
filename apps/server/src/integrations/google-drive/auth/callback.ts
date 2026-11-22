import { db } from "@padyna/db";
import { googleDriveIntegration } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  exchangeGoogleDriveAuthorizationCode,
  getGoogleDriveProfile,
  GoogleDriveApiError,
} from "./client";
import { consumeGoogleDriveOAuthState, getGoogleDriveCallbackUrl } from "../utils";
import { isOAuthStateOwner, OAUTH_STATE_OWNER_MESSAGE } from "../../oauth-state-owner";

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

export async function handleGoogleDriveOAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) {
    return c.json({ message: "Google Drive OAuth error", error: oauthError }, 400);
  }

  if (!code || !state) {
    return c.json({ message: "Missing code or state" }, 400);
  }

  const stateRecord = await consumeGoogleDriveOAuthState(state);
  if (!stateRecord) {
    return c.json({ message: "Invalid or expired OAuth state" }, 400);
  }

  if (!(await isOAuthStateOwner(c, stateRecord.userId))) {
    return c.json({ message: OAUTH_STATE_OWNER_MESSAGE }, 403);
  }

  try {
    const tokenResponse = await exchangeGoogleDriveAuthorizationCode({
      code,
      redirectUri: getGoogleDriveCallbackUrl(),
    });
    const profile = await getGoogleDriveProfile(tokenResponse.access_token);

    await db
      .insert(googleDriveIntegration)
      .values({
        userId: stateRecord.userId,
        chatbotId: stateRecord.chatbotId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        expiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : null,
        scope: tokenResponse.scope ?? null,
        tokenType: tokenResponse.token_type ?? null,
        accountId: profile.id ?? null,
        accountEmail: profile.email ?? null,
        accountName: profile.name ?? null,
        accountPicture: profile.picture ?? null,
        rawProfile: profile,
        isActive: true,
        disconnectedAt: null,
      })
      .onConflictDoUpdate({
        target: googleDriveIntegration.chatbotId,
        set: {
          userId: stateRecord.userId,
          accessToken: tokenResponse.access_token,
          ...(tokenResponse.refresh_token ? { refreshToken: tokenResponse.refresh_token } : {}),
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          scope: tokenResponse.scope ?? null,
          tokenType: tokenResponse.token_type ?? null,
          accountId: profile.id ?? null,
          accountEmail: profile.email ?? null,
          accountName: profile.name ?? null,
          accountPicture: profile.picture ?? null,
          rawProfile: profile,
          isActive: true,
          disconnectedAt: null,
          updatedAt: new Date(),
        },
      });

    const [integration] = await db
      .select({ id: googleDriveIntegration.id })
      .from(googleDriveIntegration)
      .where(eq(googleDriveIntegration.chatbotId, stateRecord.chatbotId))
      .limit(1);

    return c.json({
      success: true,
      integrationId: integration?.id ?? null,
      chatbotId: stateRecord.chatbotId,
      accountEmail: profile.email ?? null,
    });
  } catch (error) {
    if (error instanceof GoogleDriveApiError) {
      return c.json(
        { message: error.message, details: error.details },
        getGoogleDriveErrorStatusCode(error.statusCode),
      );
    }

    return c.json({ message: "Failed to complete Google Drive OAuth flow" }, 502);
  }
}
