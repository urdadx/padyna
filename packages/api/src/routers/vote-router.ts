import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { and, eq, sql } from "drizzle-orm";
import { chatConversation, vote } from "@padyna/db/schema/chat";
import { chatbot } from "@padyna/db/schema/chatbot";

export const voteRouter = router({
  cast: publicProcedure
    .input(
      z.object({
        chatId: z.uuid(),
        messageId: z.string(),
        chatbotId: z.uuid(),
        isUpvoted: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      // Votes count only for a real conversation of this chatbot, once per message.
      const [conversation] = await db
        .select({ id: chatConversation.id })
        .from(chatConversation)
        .where(and(eq(chatConversation.id, input.chatId), eq(chatConversation.chatbotId, input.chatbotId)))
        .limit(1);
      if (!conversation) {
        return { success: false };
      }

      const inserted = await db
        .insert(vote)
        .values({
          chatId: input.chatId,
          messageId: input.messageId,
          chatbotId: input.chatbotId,
          isUpvoted: input.isUpvoted,
        })
        .onConflictDoNothing()
        .returning({ chatId: vote.chatId });
      if (inserted.length === 0) {
        return { success: true };
      }

      const column = input.isUpvoted ? chatbot.upvotes : chatbot.downvotes;
      await db
        .update(chatbot)
        .set({
          [input.isUpvoted ? "upvotes" : "downvotes"]: sql`${column} + 1`,
        })
        .where(eq(chatbot.id, input.chatbotId));

      return { success: true };
    }),

  getCounts: protectedProcedure.query(async ({ ctx }) => {
    const chatbotId = ctx.session.session.activeChatbot;
    if (!chatbotId) {
      throw new Error("No active chatbot");
    }

    const result = await db
      .select({ upvotes: chatbot.upvotes, downvotes: chatbot.downvotes })
      .from(chatbot)
      .where(eq(chatbot.id, chatbotId))
      .limit(1);

    return {
      upvotes: result[0]?.upvotes ?? 0,
      downvotes: result[0]?.downvotes ?? 0,
    };
  }),
});
