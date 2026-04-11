import { db } from "@padyna/db";
import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { calActionConfigSchema, calActionToolInputSchema, parseCalUrl } from "./schema";

type CalActionRecord = typeof agentAction.$inferSelect;

export function CalActionTool(action: CalActionRecord) {
  const config = calActionConfigSchema.parse(action.config);
  const parsed = parseCalUrl(config.calUrl);

  if (!parsed) {
    throw new Error("Invalid Cal.com URL in action config");
  }

  return tool({
    description: `${action.description}. This action lets users book a meeting via Cal.com. Only use it when the user wants to schedule a meeting that matches this workflow.`,
    inputSchema: calActionToolInputSchema,
    execute: async ({ inviteeEmail, inviteeName }) => {
      await db
        .update(agentAction)
        .set({
          timesUsed: sql`${agentAction.timesUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agentAction.id, action.id));

      return {
        kind: "cal_appointment_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
        title: action.name,
        helperText: action.description,
        username: parsed.username,
        eventSlug: parsed.eventSlug,
        inviteeEmail: inviteeEmail ?? "",
        inviteeName: inviteeName ?? "",
      };
    },
  });
}