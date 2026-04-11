import { z } from "zod";

export const calActionConfigSchema = z.object({
  calUrl: z.string().trim().url(),
});

export function parseCalUrl(calUrl: string) {
  try {
    const url = new URL(calUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      return null;
    }
    return {
      username: pathParts[0],
      eventSlug: pathParts[1],
    };
  } catch {
    return null;
  }
}

export const createCalAgentActionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
  config: calActionConfigSchema,
});

export const jiraActionConfigSchema = z.object({
  projectId: z.string().trim().min(1),
  projectKey: z.string().trim().min(1),
  projectName: z.string().trim().min(1),
  issueTypeId: z.string().trim().min(1),
  issueTypeName: z.string().trim().min(1),
});

export const createJiraAgentActionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
  config: jiraActionConfigSchema,
});

export const calendlyActionConfigSchema = z.object({
  eventTypeUri: z.string().trim().min(1),
  eventTypeName: z.string().trim().min(1),
  schedulingUrl: z.string().trim().url().nullable(),
  duration: z.number().int().positive().nullable(),
});

export const createCalendlyAgentActionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
  config: calendlyActionConfigSchema,
});

export const clickupActionConfigSchema = z.object({
  workspaceId: z.string().trim().min(1),
  workspaceName: z.string().trim().min(1),
  spaceId: z.string().trim().min(1),
  spaceName: z.string().trim().min(1),
  listId: z.string().trim().min(1),
  listName: z.string().trim().min(1),
});

export const createClickUpAgentActionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
  config: clickupActionConfigSchema,
});

export const discordActionConfigSchema = z.object({
  channelId: z.string().trim().min(1),
  channelName: z.string().trim().min(1),
  parentName: z.string().trim().min(1).nullable(),
  audience: z.enum(["none", "here", "everyone"]).optional().default("none"),
});

export const createDiscordAgentActionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
  config: discordActionConfigSchema,
});

export const slackActionConfigSchema = z.object({
  channelId: z.string().trim().min(1),
  channelName: z.string().trim().min(1),
  isPrivate: z.boolean(),
  audience: z.enum(["channel", "here", "everyone"]).optional().default("channel"),
});

export const createSlackAgentActionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
  config: slackActionConfigSchema,
});

export const jiraActionToolInputSchema = z.object({
  summary: z.string().trim().min(1).describe("Short title for the Jira issue"),
  description: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Additional Jira issue details, reproduction steps, or customer context"),
});

export const clickupActionToolInputSchema = z.object({
  name: z.string().trim().min(1).describe("Short title for the ClickUp task"),
  description: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Additional task details, reproduction steps, or customer context"),
});

export const discordActionToolInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .describe("The Discord message to send to the configured channel"),
});

export const slackActionToolInputSchema = z.object({
  content: z.string().trim().min(1).describe("The Slack message to send to the configured channel"),
});

export const calendlyActionToolInputSchema = z.object({
  inviteeEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .describe("Email to prefill on the Calendly booking page"),
  inviteeName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Name to prefill on the Calendly booking page"),
});

export const calActionToolInputSchema = z.object({
  inviteeEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .describe("Email of the person booking the meeting"),
  inviteeName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Name of the person booking the meeting"),
});
