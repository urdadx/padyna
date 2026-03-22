import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, sql } from "drizzle-orm";
import { chatConversation } from "@padyna/db/schema/chat";
import { chatbot } from "@padyna/db/schema/chatbot";
import { datasources } from "@padyna/db/schema/index";

export const metricsRouter = router({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;

    if (!organizationId || !chatbotId) {
      throw new Error("No active organization or chatbot");
    }

    const [conversationsResult, chatbotResult, sourcesResult] = await Promise.all([
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
    ]);

    return {
      conversationsCount: conversationsResult[0]?.count ?? 0,
      upvotes: chatbotResult[0]?.upvotes ?? 0,
      downvotes: chatbotResult[0]?.downvotes ?? 0,
      sourcesCount: sourcesResult[0]?.count ?? 0,
    };
  }),
});
