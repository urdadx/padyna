import { tool } from "ai";
import { db } from "@padyna/db";
import { chatConversation } from "@padyna/db/schema/chat";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

interface CreateEscalateToHumanToolInput {
  chatbotId: string;
  organizationId: string;
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
      const existing = await db
        .select({ id: chatConversation.id })
        .from(chatConversation)
        .where(
          and(
            eq(chatConversation.chatbotId, input.chatbotId),
            eq(chatConversation.organizationId, input.organizationId),
          ),
        )
        .orderBy(chatConversation.createdAt)
        .limit(1);

      const conversationId = existing[0]?.id;

      if (conversationId) {
        await db
          .update(chatConversation)
          .set({
            status: "escalated",
            metadata: {
              escalationReason: reason,
              escalationSummary: summary,
              escalatedAt: new Date().toISOString(),
            },
          })
          .where(eq(chatConversation.id, conversationId));
      }

      return {
        success: true,
        message:
          "Your request has been received. A human agent will be with you shortly. Please wait while we connect you.",
      };
    },
  });
}
