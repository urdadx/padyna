import { db } from "@padyna/db";
import { calendlyIntegration } from "@padyna/db/schema/index";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/auth-middleware";
import { handleCalendlyOAuthCallback } from "./auth/callback";
import { createCalendlyConnectUrl } from "./auth/connect";
import { syncCalendlyEventTypes } from "./get-event-types";
import { verifyActiveChatbotAccess, type CalendlyAuthContext } from "./utils";

type Variables = {
  user: any;
  session: any;
};

const securedCalendlyRoutes = new Hono<{ Variables: Variables }>();
securedCalendlyRoutes.use(authMiddleware);

securedCalendlyRoutes.get("/connect", async (c) => {
  return createCalendlyConnectUrl(c);
});

securedCalendlyRoutes.get("/status", async (c) => {
  const user = c.get("user") as CalendlyAuthContext["user"];
  const session = c.get("session") as CalendlyAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [integration] = await db
    .select({
      id: calendlyIntegration.id,
      chatbotId: calendlyIntegration.chatbotId,
      userId: calendlyIntegration.userId,
      userUri: calendlyIntegration.userUri,
      organizationUri: calendlyIntegration.organizationUri,
      accessTokenExpiresAt: calendlyIntegration.accessTokenExpiresAt,
      scope: calendlyIntegration.scope,
      isActive: calendlyIntegration.isActive,
      disconnectedAt: calendlyIntegration.disconnectedAt,
      updatedAt: calendlyIntegration.updatedAt,
      eventTypes: calendlyIntegration.eventTypes,
    })
    .from(calendlyIntegration)
    .where(eq(calendlyIntegration.chatbotId, access.chatbotId))
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

securedCalendlyRoutes.get("/event-types", async (c) => {
  return syncCalendlyEventTypes(c);
});

securedCalendlyRoutes.delete("/disconnect", async (c) => {
  const user = c.get("user") as CalendlyAuthContext["user"];
  const session = c.get("session") as CalendlyAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const [updated] = await db
    .update(calendlyIntegration)
    .set({
      isActive: false,
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(calendlyIntegration.chatbotId, access.chatbotId),
        eq(calendlyIntegration.isActive, true),
      ),
    )
    .returning({ id: calendlyIntegration.id });

  return c.json({
    disconnected: Boolean(updated),
    chatbotId: access.chatbotId,
  });
});

export const calendlyRoutes = new Hono();

calendlyRoutes.get("/callback", handleCalendlyOAuthCallback);
calendlyRoutes.route("/", securedCalendlyRoutes);
