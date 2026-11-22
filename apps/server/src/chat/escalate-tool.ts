import { tool } from "ai";
import { db } from "@padyna/db";
import { createOrganizationNotification } from "@padyna/db/notifications";
import { member, user } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resendClient } from "@padyna/api/lib/email";
import { EscalationEmail } from "@padyna/email-templates";
import {
  broadcastConversationStatusUpdate,
  getConversationByChatbotAndOrganization,
  initializeLiveChatConversation,
} from "./live-chat-service";
import { checkRateLimit } from "../lib/ratelimiter";

interface CreateEscalateToHumanToolInput {
  chatbotId: string;
  organizationId: string;
  chatbotName?: string;
  conversationId?: string;
  userId?: string;
}

export function EscalateToHumanTool(input: CreateEscalateToHumanToolInput) {
  return tool({
    description:
      "Escalate the conversation to a human agent. Use when the user explicitly requests to speak with a human, or when you are unable to confidently resolve the user's issue.",
    inputSchema: z.object({
      reason: z
        .string()
        .optional()
        .describe("The reason for escalation (e.g., 'customer request', 'complex issue')"),
      summary: z
        .string()
        .optional()
        .describe("Brief summary of the conversation so far for the human agent"),
    }),
    execute: async ({ reason, summary }) => {
      let conversationId = input.conversationId;

      if (!conversationId) {
        const existingConversation = await getConversationByChatbotAndOrganization({
          chatbotId: input.chatbotId,
          organizationId: input.organizationId,
          userId: input.userId,
        });

        conversationId = existingConversation?.id;
      }

      if (conversationId) {
        await initializeLiveChatConversation({
          conversationId,
          status: "escalated",
          reason,
          summary,
        });

        try {
          await createOrganizationNotification({
            organizationId: input.organizationId,
            chatbotId: input.chatbotId,
            actorUserId: input.userId,
            eventType: "chat.escalated",
            entityType: "conversation",
            entityId: conversationId,
            title: "Conversation escalated",
            body: reason ?? "Escalated by AI assistant",
            metadata: {
              conversationId,
              reason,
              summary,
              source: "escalate_tool",
            },
            dedupeKey: `chat.escalated:${conversationId}`,
          });
        } catch (error) {
          console.error("Failed to create chat.escalated notification", error);
        }

        broadcastConversationStatusUpdate({
          conversationId,
          status: "escalated",
        });

        const members = await db
          .select({
            email: user.email,
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(eq(member.organizationId, input.organizationId));

        // Each escalation emails every member, and visitors can start conversations freely, so
        // cap the emails per organization. In-app notifications still record every escalation.
        const emailAllowance = await checkRateLimit({
          namespace: "escalation-email",
          identifier: input.organizationId,
          maxRequests: 20,
          windowSeconds: 60 * 60,
        });

        if (members.length > 0 && emailAllowance.allowed) {
          const emailBatch = members.map((m) => ({
            from: "Padyna <escalation@padyna.com>",
            to: [m.email],
            subject: `🚨 Conversation escalated - ${input.chatbotName || "Your chatbot"}`,
            react: EscalationEmail({
              chatId: conversationId,
              reason: reason || "other",
              chatbotName: input.chatbotName || "Your Chatbot",
              summary,
            }),
          }));

          await resendClient.batch.send(emailBatch);
        }
      }

      return {
        success: true,
        message:
          "Your request has been received. A human agent will be with you shortly. Please wait while we connect you.",
      };
    },
  });
}
