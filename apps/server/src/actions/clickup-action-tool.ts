import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { clickupIssueFormOutputSchema } from "@padyna/api/actions/contracts";
import { clickupActionConfigSchema, clickupActionToolInputSchema } from "./schema";

type ClickUpActionRecord = typeof agentAction.$inferSelect;

export function ClickUpActionTool(action: ClickUpActionRecord) {
  const config = clickupActionConfigSchema.parse(action.config);

  return tool({
    description: `${action.description} Opens a ClickUp task form for the ${config.listName} list inside ${config.spaceName}. The form collects the task details.`,
    inputSchema: clickupActionToolInputSchema,
    execute: async () => {
      return clickupIssueFormOutputSchema.parse({
        kind: "clickup_issue_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
      });
    },
  });
}
