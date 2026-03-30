import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, desc } from "drizzle-orm";
import { chatConversation, chatMessage } from "@padyna/db/schema/chat";

export const conversationsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;

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

  getById: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const [conversation] = await db
        .select()
        .from(chatConversation)
        .where(eq(chatConversation.id, input.id))
        .limit(1);

      if (!conversation || conversation.organizationId !== organizationId) {
        throw new Error("Conversation not found");
      }

      return conversation;
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

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        status: z.enum(["opened", "escalated", "closed", "assigned"]),
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
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(chatConversation.id, input.id))
        .returning();

      return updated;
    }),

  updatePriority: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        isHighPriority: z.boolean(),
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
          isHighPriority: input.isHighPriority,
          updatedAt: new Date(),
        })
        .where(eq(chatConversation.id, input.id))
        .returning();

      return updated;
    }),
  getConversationCount: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;

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
      );

    return {
      count: result.length,
    };
  }),

  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      const chatbotId = ctx.session.session.activeChatbot;

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
        .orderBy(desc(chatConversation.updatedAt))
        .limit(input.limit);

      return result;
    }),
});
