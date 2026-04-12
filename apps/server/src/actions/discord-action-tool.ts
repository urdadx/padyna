import { db } from "@padyna/db";
import { agentAction } from "@padyna/db/schema/index";
import { eq, sql } from "drizzle-orm";
import { tool } from "ai";
import { sendDiscordChannelMessage } from "../integrations/discord";
import { discordActionConfigSchema, discordActionToolInputSchema } from "./schema";

type DiscordActionRecord = typeof agentAction.$inferSelect;

export function DiscordActionTool(action: DiscordActionRecord) {
  const config = discordActionConfigSchema.parse(action.config);
  const channelLabel = config.parentName
    ? `${config.parentName} / #${config.channelName}`
    : `#${config.channelName}`;
  const audienceLabel =
    config.audience === "here"
      ? " It will notify active members with @here."
      : config.audience === "everyone"
        ? " It will notify everyone with @everyone."
        : "";

  return tool({
    description: `${action.description} This action sends a Discord message to ${channelLabel}.${audienceLabel} Only use it when the user's request clearly matches this configured workflow.`,
    inputSchema: discordActionToolInputSchema,
    execute: async ({ content }) => {
      await sendDiscordChannelMessage({
        chatbotId: action.chatbotId,
        channelId: config.channelId,
        content,
        audience: config.audience,
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
      };
    },
  });
}
