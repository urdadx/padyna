import { tool } from "ai";
import { agentAction } from "@padyna/db/schema/index";
import { jiraIssueFormOutputSchema } from "@padyna/api/actions/contracts";
import { jiraActionConfigSchema, jiraActionToolInputSchema } from "./schema";

type JiraActionRecord = typeof agentAction.$inferSelect;

export function JiraActionTool(action: JiraActionRecord) {
  const config = jiraActionConfigSchema.parse(action.config);

  return tool({
    description: `${action.description} Opens a Jira ${config.issueTypeName} form for the ${config.projectName} (${config.projectKey}) project. The form collects the issue details.`,
    inputSchema: jiraActionToolInputSchema,
    execute: async () => {
      return jiraIssueFormOutputSchema.parse({
        kind: "jira_issue_form",
        actionId: action.id,
        chatbotId: action.chatbotId,
      });
    },
  });
}
