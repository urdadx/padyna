import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { jiraActionConfigSchema, jiraActionToolInputSchema } from "./schema";

type JiraActionRecord = typeof agentAction.$inferSelect;

export function JiraActionTool(action: JiraActionRecord) {
  const config = jiraActionConfigSchema.parse(action.config);

  return tool({
    description: `${action.description} This action creates a Jira ${config.issueTypeName} issue in the ${config.projectName} (${config.projectKey}) project. Only use it when the user's request clearly matches this configured workflow.`,
    inputSchema: jiraActionToolInputSchema,
    execute: async ({ summary, description }) => {
      return {
        kind: "jira_issue_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
        title: action.name,
        helperText: action.description,
        projectName: config.projectName,
        projectKey: config.projectKey,
        issueTypeName: config.issueTypeName,
        summary: summary ?? "",
        description: description ?? "",
      };
    },
  });
}
