import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, or, desc, asc, SQL } from "drizzle-orm";
import { chatConversation, chatMessage } from "@padyna/db/schema/chat";
import { createOrganizationNotification } from "@padyna/db/notifications";
import { env } from "@padyna/env/server";
import { randomUUID } from "node:crypto";

function getLiveChatToken(metadata: Record<string, unknown> | undefined): string {
  const token = metadata?.liveChatToken;
  if (typeof token === "string" && token.trim().length > 0) {
    return token.trim();
  }

  return randomUUID();
}

const conversationSortSchema = z.enum([
  "recent",
  "oldest",
  "priority",
  "web",
  "whatsapp",
  "telegram",
  "discord",
  "slack",
  "instagram",
  "messenger",
  "googlechat",
  "teams",
  "linear",
]);

function isPlatformSort(sort: z.infer<typeof conversationSortSchema>) {
  return !["recent", "oldest", "priority"].includes(sort);
}

type DiscordConversationMetadata = {
  channelId?: string | null;
  threadId?: string | null;
};

function getDiscordApiChannelId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("discord:")) {
    return trimmed;
  }

  const [, , , threadId] = trimmed.split(":");
  return threadId?.trim() || null;
}

function isConversationInHumanHandoff(status: string | null | undefined) {
  return status === "escalated" || status === "assigned";
}

async function postDiscordConversationReply(args: {
  metadata: Record<string, unknown> | null | undefined;
  text: string;
}) {
  if (!env.DISCORD_BOT_TOKEN) {
    throw new Error("Discord bot is not configured");
  }

  const metadata = (args.metadata ?? {}) as DiscordConversationMetadata;
  const targetChannelId =
    getDiscordApiChannelId(metadata.threadId) ?? getDiscordApiChannelId(metadata.channelId);

  if (!targetChannelId) {
    throw new Error("Discord conversation is missing routing metadata");
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${encodeURIComponent(targetChannelId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: args.text }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post Discord reply: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { id?: unknown };
  if (typeof data.id !== "string" || data.id.length === 0) {
    throw new Error("Discord reply did not return a message id");
  }

  return {
    messageId: data.id,
  };
}

export const conversationsRouter = router({
  getAll: protectedProcedure
    .input(
      z
        .object({
          filter: z.enum(["all", "escalated", "opened", "closed", "assigned"]),
          sort: conversationSortSchema,
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      const chatbotId = ctx.session.session.activeChatbot;
      const userId = ctx.session.user.id;

      const filter = input?.filter ?? "all";
      const sort = input?.sort ?? "recent";
      const limit = input?.limit ?? 100;

      if (!organizationId || !chatbotId) {
        throw new Error("No active organization or chatbot");
      }

      const filters: (SQL | undefined)[] = [
        eq(chatConversation.chatbotId, chatbotId),
        eq(chatConversation.organizationId, organizationId),
      ];

      if (filter !== "all") {
        if (filter === "assigned") {
          filters.push(eq(chatConversation.status, "assigned"));
          filters.push(eq(chatConversation.assignedTo, userId));
        } else if (filter === "escalated") {
          filters.push(
            or(eq(chatConversation.status, "escalated"), eq(chatConversation.status, "assigned")),
          );
        } else {
          filters.push(eq(chatConversation.status, filter));
        }
      }

      if (isPlatformSort(sort)) {
        if (sort === "web") {
          filters.push(
            or(eq(chatConversation.channel, "web"), eq(chatConversation.channel, "widget")),
          );
        } else {
          filters.push(eq(chatConversation.channel, sort));
        }
      }

      let orderBy: SQL[] = [desc(chatConversation.updatedAt)];
      if (sort === "oldest") {
        orderBy = [asc(chatConversation.updatedAt)];
      } else if (sort === "priority") {
        orderBy = [desc(chatConversation.isHighPriority), desc(chatConversation.updatedAt)];
      }

      const result = await db
        .select()
        .from(chatConversation)
        .where(and(...filters))
        .orderBy(...orderBy)
        .limit(limit);

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

  sendEscalatedReply: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        text: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const [record] = await db
        .select()
        .from(chatConversation)
        .where(eq(chatConversation.id, input.id))
        .limit(1);

      if (!record || record.organizationId !== organizationId) {
        throw new Error("Conversation not found");
      }

      if (record.channel !== "discord") {
        throw new Error("Native escalated replies are only supported for Discord right now");
      }

      if (!isConversationInHumanHandoff(record.status)) {
        throw new Error("Conversation is not currently escalated");
      }

      const isAdmin = ctx.session.user.role === "admin";
      const isAssignedToCurrentUser = record.assignedTo === ctx.session.user.id;
      if (record.assignedTo && !isAdmin && !isAssignedToCurrentUser) {
        throw new Error("Conversation is assigned to another member");
      }

      const reply = await postDiscordConversationReply({
        metadata: record.metadata,
        text: input.text,
      });

      const nextStatus = record.status === "assigned" ? record.status : "assigned";
      const nextAssignedTo = record.assignedTo ?? ctx.session.user.id;

      await db.insert(chatMessage).values({
        conversationId: record.id,
        chatbotId: record.chatbotId,
        organizationId: record.organizationId,
        userId: ctx.session.user.id,
        role: "assistant",
        messageId: reply.messageId,
        contentText: input.text,
        parts: [{ type: "text", text: input.text }],
      });

      const [updated] = await db
        .update(chatConversation)
        .set({
          status: nextStatus,
          assignedTo: nextAssignedTo,
          updatedAt: new Date(),
        })
        .where(eq(chatConversation.id, record.id))
        .returning();

      if (updated && updated.status !== record.status) {
        ctx.liveChat?.broadcastConversationStatus?.({
          conversationId: updated.id,
          status: updated.status,
        });
      }

      return {
        message: {
          id: reply.messageId,
          messageId: reply.messageId,
          role: "assistant" as const,
          contentText: input.text,
          parts: [{ type: "text", text: input.text }],
          chatbotId: record.chatbotId,
          userId: ctx.session.user.id,
          createdAt: new Date(),
        },
        conversation: updated ?? record,
      };
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

      try {
        await createOrganizationNotification({
          organizationId,
          chatbotId: record.chatbotId,
          actorUserId: ctx.session.user.id,
          eventType: "chat.deleted",
          entityType: "conversation",
          entityId: record.id,
          title: "Conversation deleted",
          body: record.title,
          metadata: {
            conversationId: record.id,
            previousStatus: record.status,
          },
        });
      } catch (error) {
        console.error("Failed to create chat.deleted notification", error);
      }

      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        status: z.enum(["opened", "escalated", "closed", "assigned"]),
        assignedTo: z.string().uuid().optional(),
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

      const isAdmin = ctx.session.user.role === "admin";
      const removingExistingAssignment =
        record.status === "assigned" && input.status !== "assigned";
      const assignedToCurrentUser = record.assignedTo === ctx.session.user.id;

      if (removingExistingAssignment && !isAdmin && !assignedToCurrentUser) {
        throw new Error("Only admins or the assigned member can remove this assignment");
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
            : input.status === "assigned"
              ? (() => {
                  if (!isAdmin) {
                    const alreadyAssignedToOther =
                      Boolean(record.assignedTo) && record.assignedTo !== ctx.session.user.id;

                    if (alreadyAssignedToOther) {
                      throw new Error("Conversation is already assigned to another member");
                    }

                    return { assignedTo: ctx.session.user.id };
                  }

                  return { assignedTo: input.assignedTo ?? ctx.session.user.id };
                })()
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

        const eventTypeByStatus = {
          escalated: "chat.escalated",
          opened: "chat.opened",
          closed: "chat.closed",
          assigned: null,
        } as const;

        const eventType = eventTypeByStatus[input.status];

        if (eventType) {
          try {
            await createOrganizationNotification({
              organizationId,
              chatbotId: updated.chatbotId,
              actorUserId: ctx.session.user.id,
              eventType,
              entityType: "conversation",
              entityId: updated.id,
              title:
                input.status === "escalated"
                  ? "Conversation escalated"
                  : input.status === "opened"
                    ? "Conversation reopened"
                    : "Conversation closed",
              body: updated.title,
              metadata: {
                conversationId: updated.id,
                status: input.status,
                previousStatus: record.status,
              },
            });
          } catch (error) {
            console.error(`Failed to create ${eventType} notification`, error);
          }
        }
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

      if (updated && input.isHighPriority) {
        try {
          await createOrganizationNotification({
            organizationId,
            chatbotId: updated.chatbotId,
            actorUserId: ctx.session.user.id,
            eventType: "chat.priority_marked",
            entityType: "conversation",
            entityId: updated.id,
            title: "Conversation marked as priority",
            body: updated.title,
            metadata: {
              conversationId: updated.id,
              isHighPriority: true,
            },
          });
        } catch (error) {
          console.error("Failed to create chat.priority_marked notification", error);
        }
      }

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
