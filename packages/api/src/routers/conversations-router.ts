import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, desc, asc, SQL } from "drizzle-orm";
import { chatConversation, chatMessage } from "@padyna/db/schema/chat";
import { randomUUID } from "node:crypto";

function getLiveChatToken(metadata: Record<string, unknown> | undefined): string {
  const token = metadata?.liveChatToken;
  if (typeof token === "string" && token.trim().length > 0) {
    return token.trim();
  }

  return randomUUID();
}

export const conversationsRouter = router({
  getAll: protectedProcedure
    .input(
      z
        .object({
          filter: z.enum(["all", "escalated", "opened", "closed", "assigned"]),
          sort: z.enum(["recent", "oldest", "priority"]),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      const chatbotId = ctx.session.session.activeChatbot;
      const userId = ctx.session.user.id;

      const filter = input?.filter ?? "all";
      const sort = input?.sort ?? "recent";

      if (!organizationId || !chatbotId) {
        throw new Error("No active organization or chatbot");
      }

      const filters: (SQL | undefined)[] = [
        eq(chatConversation.chatbotId, chatbotId),
        eq(chatConversation.organizationId, organizationId),
      ];

      if (filter !== "all") {
        if (filter === "assigned") {
          filters.push(eq(chatConversation.assignedTo, userId));
        } else {
          filters.push(eq(chatConversation.status, filter));
        }
      }

      let orderBy = desc(chatConversation.updatedAt);
      if (sort === "oldest") {
        orderBy = asc(chatConversation.updatedAt);
      } else if (sort === "priority") {
        orderBy = desc(chatConversation.isHighPriority);
      }

      const result = await db
        .select()
        .from(chatConversation)
        .where(and(...filters))
        .orderBy(orderBy);

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

      if (updated) {
        ctx.liveChat?.broadcastConversationStatus?.({
          conversationId: updated.id,
          status: updated.status,
        });
      }

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
          ...(input.status === "escalated"
            ? {
                assignedTo: null,
                metadata: {
                  ...(record.metadata as Record<string, unknown> | undefined),
                  escalatedAt: new Date().toISOString(),
                  liveChatToken: getLiveChatToken(
                    record.metadata as Record<string, unknown> | undefined,
                  ),
                  liveChatInitializedAt: new Date().toISOString(),
                  liveChatPhase: "waiting_for_join",
                },
              }
            : input.status === "opened" || input.status === "closed"
              ? { assignedTo: null }
              : {}),
          updatedAt: new Date(),
        })
        .where(eq(chatConversation.id, input.id))
        .returning();

      if (updated) {
        ctx.liveChat?.broadcastConversationStatus?.({
          conversationId: updated.id,
          status: updated.status,
        });
      }

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
