import { db } from "@padyna/db";
import { calendlyIntegration } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  exchangeCalendlyAuthorizationCode,
  getCalendlyCurrentUser,
  getCalendlyEventTypes,
  type CalendlyEventType,
} from "./client";
import { consumeCalendlyOAuthState, getCalendlyCallbackUrl } from "../utils";
import { isOAuthStateOwner, OAUTH_STATE_OWNER_MESSAGE } from "../../oauth-state-owner";

export async function handleCalendlyOAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) {
    return c.json({ message: "Calendly OAuth error", error: oauthError }, 400);
  }

  if (!code || !state) {
    return c.json({ message: "Missing code or state" }, 400);
  }

  const stateRecord = await consumeCalendlyOAuthState(state);
  if (!stateRecord) {
    return c.json({ message: "Invalid or expired OAuth state" }, 400);
  }

  if (!(await isOAuthStateOwner(c, stateRecord.userId))) {
    return c.json({ message: OAUTH_STATE_OWNER_MESSAGE }, 403);
  }

  const callbackUrl = getCalendlyCallbackUrl();

  const tokenResponse = await exchangeCalendlyAuthorizationCode({
    code,
    redirectUri: callbackUrl,
  });

  const calendlyUser = await getCalendlyCurrentUser(tokenResponse.access_token);

  let eventTypes: CalendlyEventType[] = [];
  try {
    eventTypes = await getCalendlyEventTypes(tokenResponse.access_token, calendlyUser.uri);
  } catch {
    eventTypes = [];
  }

  const accessTokenExpiresAt = new Date(
    (tokenResponse.created_at + tokenResponse.expires_in) * 1000,
  );

  await db
    .insert(calendlyIntegration)
    .values({
      userId: stateRecord.userId,
      chatbotId: stateRecord.chatbotId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      accessTokenExpiresAt,
      scope: tokenResponse.scope,
      organizationUri: calendlyUser.current_organization,
      userUri: calendlyUser.uri,
      eventTypes,
      isActive: true,
      disconnectedAt: null,
    })
    .onConflictDoUpdate({
      target: calendlyIntegration.chatbotId,
      set: {
        userId: stateRecord.userId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        accessTokenExpiresAt,
        scope: tokenResponse.scope,
        organizationUri: calendlyUser.current_organization,
        userUri: calendlyUser.uri,
        eventTypes,
        isActive: true,
        disconnectedAt: null,
        updatedAt: new Date(),
      },
    });

  const [integration] = await db
    .select({ id: calendlyIntegration.id })
    .from(calendlyIntegration)
    .where(eq(calendlyIntegration.chatbotId, stateRecord.chatbotId))
    .limit(1);

  return c.json({
    success: true,
    integrationId: integration?.id ?? null,
    chatbotId: stateRecord.chatbotId,
    eventTypesCount: eventTypes.length,
  });
}
