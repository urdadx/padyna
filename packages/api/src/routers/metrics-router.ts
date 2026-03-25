import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { chatConversation } from "@padyna/db/schema/chat";
import { chatbot } from "@padyna/db/schema/chatbot";
import { datasources, visitorSessions } from "@padyna/db/schema/index";

export const metricsRouter = router({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;

    if (!organizationId || !chatbotId) {
      throw new Error("No active organization or chatbot");
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [conversationsResult, chatbotResult, sourcesResult, visitorsResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatConversation)
        .where(
          and(
            eq(chatConversation.chatbotId, chatbotId),
            eq(chatConversation.organizationId, organizationId),
          ),
        ),
      db
        .select({ upvotes: chatbot.upvotes, downvotes: chatbot.downvotes })
        .from(chatbot)
        .where(eq(chatbot.id, chatbotId))
        .limit(1),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(datasources)
        .where(
          and(eq(datasources.chatbotId, chatbotId), eq(datasources.organizationId, organizationId)),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${visitorSessions.visitorId})::int` })
        .from(visitorSessions)
        .where(
          and(
            eq(visitorSessions.chatbotId, chatbotId),
            gte(visitorSessions.startedAt, thirtyDaysAgo),
            lte(visitorSessions.startedAt, now),
          ),
        ),
    ]);

    return {
      conversationsCount: conversationsResult[0]?.count ?? 0,
      upvotes: chatbotResult[0]?.upvotes ?? 0,
      downvotes: chatbotResult[0]?.downvotes ?? 0,
      sourcesCount: sourcesResult[0]?.count ?? 0,
      uniqueVisitors: visitorsResult[0]?.count ?? 0,
    };
  }),
});
