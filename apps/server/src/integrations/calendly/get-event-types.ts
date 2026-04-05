import { db } from "@padyna/db";
import { calendlyIntegration } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { CalendlyApiError, getCalendlyEventTypes } from "./auth/client";
import {
  getActiveCalendlyIntegrationByChatbot,
  refreshCalendlyAccessTokenIfNeeded,
  verifyActiveChatbotAccess,
  type CalendlyAuthContext,
} from "./utils";

export async function syncCalendlyEventTypes(c: Context) {
  const user = c.get("user") as CalendlyAuthContext["user"];
  const session = c.get("session") as CalendlyAuthContext["session"];

  if (!user?.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const access = await verifyActiveChatbotAccess({ user, session });
  if (!access) {
    return c.json({ message: "No active chatbot in your current organization" }, 400);
  }

  const integration = await getActiveCalendlyIntegrationByChatbot(access.chatbotId);
  if (!integration) {
    return c.json({ message: "Calendly is not connected for this chatbot" }, 404);
  }

  try {
    const usableIntegration = await refreshCalendlyAccessTokenIfNeeded(integration);
    const eventTypes = await getCalendlyEventTypes(
      usableIntegration.accessToken,
      usableIntegration.userUri,
    );

    await db
      .update(calendlyIntegration)
      .set({
        eventTypes,
        updatedAt: new Date(),
      })
      .where(eq(calendlyIntegration.id, usableIntegration.id));

    return c.json({
      chatbotId: access.chatbotId,
      count: eventTypes.length,
      eventTypes,
    });
  } catch (error) {
    if (error instanceof CalendlyApiError) {
      const statusCode =
        error.statusCode === 400
          ? 400
          : error.statusCode === 401
            ? 401
            : error.statusCode === 403
              ? 403
              : error.statusCode === 404
                ? 404
                : error.statusCode === 409
                  ? 409
                  : error.statusCode === 422
                    ? 422
                    : error.statusCode === 429
                      ? 429
                      : 502;
      return c.json(
        {
          message: error.message,
          details: error.details,
        },
        statusCode,
      );
    }

    return c.json({ message: "Failed to fetch Calendly event types" }, 502);
  }
}
