import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { clickupActionConfigSchema, clickupActionToolInputSchema } from "./schema";

type ClickUpActionRecord = typeof agentAction.$inferSelect;

export function ClickUpActionTool(action: ClickUpActionRecord) {
  const config = clickupActionConfigSchema.parse(action.config);

  return tool({
    description: `${action.description} This action creates a ClickUp task in the ${config.listName} list inside ${config.spaceName}. Only use it when the user's request clearly matches this configured workflow.`,
    inputSchema: clickupActionToolInputSchema,
    execute: async ({ name, description }) => {
      return {
        kind: "clickup_issue_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
        title: action.name,
        helperText: action.description,
        workspaceName: config.workspaceName,
        spaceName: config.spaceName,
        listName: config.listName,
        name: name ?? "",
        description: description ?? "",
      };
    },
  });
}
