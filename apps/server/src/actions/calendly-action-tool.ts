import { db } from "@padyna/db";
import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { calendlyActionConfigSchema, calendlyActionToolInputSchema } from "./schema";

type CalendlyActionRecord = typeof agentAction.$inferSelect;

export function CalendlyActionTool(action: CalendlyActionRecord) {
  const config = calendlyActionConfigSchema.parse(action.config);

  return tool({
    description: `${action.description} This action opens the Calendly booking flow for ${config.eventTypeName}. Only use it when the user wants to schedule a meeting that matches this workflow.`,
    inputSchema: calendlyActionToolInputSchema,
    execute: async ({ inviteeEmail, inviteeName }) => {
      await db
        .update(agentAction)
        .set({
          timesUsed: sql`${agentAction.timesUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agentAction.id, action.id));

      return {
        kind: "calendly_appointment_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
        title: action.name,
        helperText: action.description,
        eventTypeUri: config.eventTypeUri,
        eventTypeName: config.eventTypeName,
        schedulingUrl: config.schedulingUrl,
        duration: config.duration,
        inviteeEmail: inviteeEmail ?? "",
        inviteeName: inviteeName ?? "",
      };
    },
  });
}
