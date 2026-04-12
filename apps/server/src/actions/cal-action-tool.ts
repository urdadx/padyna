import { db } from "@padyna/db";
import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { calAppointmentFormOutputSchema } from "@padyna/api/actions/contracts";
import { calActionConfigSchema, calActionToolInputSchema, parseCalUrl } from "./schema";

type CalActionRecord = typeof agentAction.$inferSelect;

export function CalActionTool(action: CalActionRecord) {
  const config = calActionConfigSchema.parse(action.config);
  const parsed = parseCalUrl(config.calUrl);

  if (!parsed) {
    throw new Error("Invalid Cal.com URL in action config");
  }

  return tool({
    description: `${action.description}. Opens the Cal.com booking form for this workflow. The form collects the attendee details.`,
    inputSchema: calActionToolInputSchema,
    execute: async () => {
      await db
        .update(agentAction)
        .set({
          timesUsed: sql`${agentAction.timesUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agentAction.id, action.id));

      return calAppointmentFormOutputSchema.parse({
        kind: "cal_appointment_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
        username: parsed.username,
        eventSlug: parsed.eventSlug,
      });
    },
  });
}
