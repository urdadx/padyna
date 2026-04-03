import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, desc, count } from "drizzle-orm";
import { chatbot, organization } from "@padyna/db/schema/index";
import { setActiveSessionContext } from "@padyna/db/set-active-session-context";
import { createOrganizationNotification } from "@padyna/db/notifications";
import { nanoid } from "nanoid";

export const agentsettingsRouter = router({
  getAllChatbots: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const result = await db
      .select()
      .from(chatbot)
      .where(eq(chatbot.organizationId, organizationId))
      .orderBy(desc(chatbot.createdAt));

    return result;
  }),

  getChatbot: protectedProcedure
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

      const [result] = await db
        .select()
        .from(chatbot)
        .where(and(eq(chatbot.id, input.id), eq(chatbot.organizationId, organizationId)))
        .limit(1);

      if (!result) {
        throw new Error("Chatbot not found");
      }

      return result;
    }),

  createChatbot: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        image: z.string().optional(),
        primaryColor: z.string().optional(),
        theme: z.enum(["light", "dark"]).optional(),
        hidePoweredBy: z.boolean().optional(),
        usecase: z.enum(["support", "technical", "sales"]).optional(),
        initialMessage: z.string().optional(),
        suggestedMessages: z.array(z.string()).optional(),
        allowedDomains: z.array(z.string()).optional(),
        isEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const [org] = await db.select().from(organization).where(eq(organization.id, organizationId));

      if (!org) {
        throw new Error("Organization not found");
      }

      const [chatbotCountResult] = await db
        .select({ chatbotCount: count() })
        .from(chatbot)
        .where(eq(chatbot.organizationId, organizationId));

      const chatbotCount = chatbotCountResult?.chatbotCount ?? 0;

      if (chatbotCount >= org.maxChatbots) {
        throw new Error(`You have reached the maximum number of agents for your plan.`);
      }

      const embedToken = `padyna_${nanoid(16)}`;

      const [created] = await db
        .insert(chatbot)
        .values({
          organizationId,
          name: input.name,
          image: input.image,
          primaryColor: input.primaryColor ?? "#6366f1",
          theme: input.theme ?? "light",
          hidePoweredBy: input.hidePoweredBy ?? false,
          usecase: input.usecase ?? "support",
          initialMessage: input.initialMessage ?? "Hi👋, What can I help you with?",
          suggestedMessages: input.suggestedMessages,
          allowedDomains: input.allowedDomains,
          isEnabled: input.isEnabled ?? true,
          embedToken,
        })
        .returning();

      if (created) {
        try {
          await createOrganizationNotification({
            organizationId,
            chatbotId: created.id,
            actorUserId: ctx.session.user.id,
            eventType: "agent.created",
            entityType: "chatbot",
            entityId: created.id,
            title: "New AI agent created",
            body: created.name ?? "Untitled agent",
            metadata: {
              chatbotId: created.id,
            },
          });
        } catch (error) {
          console.error("Failed to create agent.created notification", error);
        }
      }

      return created;
    }),

  updateChatbot: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().optional(),
        image: z.string().optional(),
        primaryColor: z.string().optional(),
        theme: z.enum(["light", "dark"]).optional(),
        hidePoweredBy: z.boolean().optional(),
        usecase: z.enum(["support", "technical", "sales"]).optional(),
        initialMessage: z.string().optional(),
        suggestedMessages: z.array(z.string()).optional(),
        allowedDomains: z.array(z.string()).optional(),
        isEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const existing = await db.select().from(chatbot).where(eq(chatbot.id, input.id)).limit(1);

      const record = existing[0];
      if (!record || record.organizationId !== organizationId) {
        throw new Error("Chatbot not found");
      }

      const [updated] = await db
        .update(chatbot)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.image !== undefined && { image: input.image }),
          ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
          ...(input.theme !== undefined && { theme: input.theme }),
          ...(input.hidePoweredBy !== undefined && { hidePoweredBy: input.hidePoweredBy }),
          ...(input.usecase !== undefined && { usecase: input.usecase }),
          ...(input.initialMessage !== undefined && { initialMessage: input.initialMessage }),
          ...(input.suggestedMessages !== undefined && {
            suggestedMessages: input.suggestedMessages,
          }),
          ...(input.allowedDomains !== undefined && {
            allowedDomains: input.allowedDomains,
          }),
          ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
          updatedAt: new Date(),
        })
        .where(eq(chatbot.id, input.id))
        .returning();

      return updated;
    }),

  deleteChatbot: protectedProcedure
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

      const existing = await db.select().from(chatbot).where(eq(chatbot.id, input.id)).limit(1);

      const record = existing[0];
      if (!record || record.organizationId !== organizationId) {
        throw new Error("Chatbot not found");
      }

      await db.delete(chatbot).where(eq(chatbot.id, input.id));

      return { success: true };
    }),

  switchChatbots: protectedProcedure
    .input(
      z.object({
        chatbotId: z.uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const organizationId = ctx.session.session.activeOrganization;

      if (!organizationId) {
        throw new Error("No active organization");
      }

      const existing = await db
        .select()
        .from(chatbot)
        .where(and(eq(chatbot.id, input.chatbotId), eq(chatbot.organizationId, organizationId)))
        .limit(1);

      if (!existing[0]) {
        throw new Error("Chatbot not found");
      }

      await setActiveSessionContext(userId, {
        activeOrganization: organizationId,
        activeChatbot: input.chatbotId,
      });

      return { success: true };
    }),
  getChatbotsCount: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const [result] = await db
      .select({ chatbotCount: count() })
      .from(chatbot)
      .where(eq(chatbot.organizationId, organizationId));

    return result?.chatbotCount ?? 0;
  }),
});
