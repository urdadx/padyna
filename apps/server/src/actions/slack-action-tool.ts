import { db } from "@padyna/db";
import { agentAction } from "@padyna/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { tool } from "ai";
import { postSlackNotification } from "../integrations/slack/client";
import { slackActionConfigSchema, slackActionToolInputSchema } from "./schema";

type SlackActionRecord = typeof agentAction.$inferSelect;

export function SlackActionTool(action: SlackActionRecord) {
  const config = slackActionConfigSchema.parse(action.config);
  const channelLabel = config.isPrivate
    ? `${config.channelName} (Private)`
    : `#${config.channelName}`;
  const audienceLabel =
    config.audience === "here"
      ? " It will notify only active members with @here."
      : config.audience === "everyone"
        ? " It will notify everyone with @everyone."
        : " It will notify the whole channel with @channel.";

  return tool({
    description: `${action.description} This action sends a Slack message to ${channelLabel}.${audienceLabel} Only use it when the user's request clearly matches this configured workflow.`,
    inputSchema: slackActionToolInputSchema,
    execute: async ({ content }) => {
      const result = await postSlackNotification({
        chatbotId: action.chatbotId,
        channelId: config.channelId,
        audience: config.audience,
        message: content,
      });

      await db
        .update(agentAction)
        .set({
          timesUsed: sql`${agentAction.timesUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agentAction.id, action.id));

      return {
        success: true,
        actionId: action.id,
        channelId: result.channelId,
        teamId: result.teamId,
        message: `Slack message sent to ${channelLabel}.`,
      };
    },
  });
}
