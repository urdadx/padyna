import { db } from "@padyna/db";
import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { calendlyAppointmentFormOutputSchema } from "@padyna/api/actions/contracts";
import { calendlyActionConfigSchema, calendlyActionToolInputSchema } from "./schema";

type CalendlyActionRecord = typeof agentAction.$inferSelect;

export function CalendlyActionTool(action: CalendlyActionRecord) {
  const config = calendlyActionConfigSchema.parse(action.config);

  return tool({
    description: `${action.description} Opens the Calendly booking form for ${config.eventTypeName}. The form collects the attendee details.`,
    inputSchema: calendlyActionToolInputSchema,
    execute: async () => {
      await db
        .update(agentAction)
        .set({
          timesUsed: sql`${agentAction.timesUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agentAction.id, action.id));

      return calendlyAppointmentFormOutputSchema.parse({
        kind: "calendly_appointment_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
        eventTypeName: config.eventTypeName,
        schedulingUrl: config.schedulingUrl,
      });
    },
  });
}
