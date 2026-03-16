import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, desc } from "drizzle-orm";
import { chatConversation, chatMessage } from "@padyna/db/schema/chat";

export const conversationsRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        chatbotId: z.uuid().optional(),
      }).optional(),
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      const chatbotId = input?.chatbotId ?? ctx.session.session.activeChatbot;
      
      if (!organizationId || !chatbotId) {
        throw new Error("No active organization or chatbot");
      }

      const result = await db
        .select()
        .from(chatConversation)
        .where(
          and(
            eq(chatConversation.chatbotId, chatbotId),
            eq(chatConversation.organizationId, organizationId),
          ),
        )
        .orderBy(desc(chatConversation.updatedAt));

      return result;
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.uuid(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const conversation = await db
        .select()
        .from(chatConversation)
        .where(eq(chatConversation.id, input.conversationId))
        .limit(1);

      if (!conversation[0] || conversation[0].organizationId !== organizationId) {
        throw new Error("Conversation not found");
      }

      const messages = await db
        .select()
        .from(chatMessage)
        .where(eq(chatMessage.conversationId, input.conversationId))
        .orderBy(chatMessage.createdAt);

      return messages;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const existing = await db
        .select()
        .from(chatConversation)
        .where(eq(chatConversation.id, input.id))
        .limit(1);

      const record = existing[0];
      if (!record || record.organizationId !== organizationId) {
        throw new Error("Conversation not found");
      }

      const [updated] = await db
        .update(chatConversation)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(chatConversation.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const existing = await db
        .select()
        .from(chatConversation)
        .where(eq(chatConversation.id, input.id))
        .limit(1);

      const record = existing[0];
      if (!record || record.organizationId !== organizationId) {
        throw new Error("Conversation not found");
      }

      await db.delete(chatConversation).where(eq(chatConversation.id, input.id));

      return { success: true };
    }),
});
