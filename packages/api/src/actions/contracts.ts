import { z } from "zod";

export const ACTION_PROVIDERS = ["jira", "clickup", "discord", "slack", "calendly", "cal"] as const;

export const actionProviderSchema = z.enum(ACTION_PROVIDERS);

export type ActionProvider = z.infer<typeof actionProviderSchema>;

export const ACTION_TOOL_OUTPUT_KINDS = [
  "cal_appointment_form",
  "calendly_appointment_form",
  "jira_issue_form",
  "clickup_issue_form",
] as const;

export const actionToolOutputKindSchema = z.enum(ACTION_TOOL_OUTPUT_KINDS);

export type ActionToolOutputKind = z.infer<typeof actionToolOutputKindSchema>;

export const calAppointmentFormOutputSchema = z.object({
  kind: z.literal("cal_appointment_form"),
  actionId: z.uuid(),
  chatbotId: z.uuid(),
  username: z.string().min(1),
  eventSlug: z.string().min(1),
});

export const calendlyAppointmentFormOutputSchema = z.object({
  kind: z.literal("calendly_appointment_form"),
  actionId: z.uuid(),
  chatbotId: z.uuid(),
  eventTypeName: z.string().min(1),
  schedulingUrl: z.string().nullable(),
});

export const jiraIssueFormOutputSchema = z.object({
  kind: z.literal("jira_issue_form"),
  actionId: z.uuid(),
  chatbotId: z.uuid(),
});

export const clickupIssueFormOutputSchema = z.object({
  kind: z.literal("clickup_issue_form"),
  actionId: z.uuid(),
  chatbotId: z.uuid(),
});

export const actionToolOutputSchema = z.discriminatedUnion("kind", [
  calAppointmentFormOutputSchema,
  calendlyAppointmentFormOutputSchema,
  jiraIssueFormOutputSchema,
  clickupIssueFormOutputSchema,
]);

export type CalAppointmentFormOutput = z.infer<typeof calAppointmentFormOutputSchema>;
export type CalendlyAppointmentFormOutput = z.infer<typeof calendlyAppointmentFormOutputSchema>;
export type JiraIssueFormOutput = z.infer<typeof jiraIssueFormOutputSchema>;
export type ClickUpIssueFormOutput = z.infer<typeof clickupIssueFormOutputSchema>;
export type ActionToolOutput = z.infer<typeof actionToolOutputSchema>;

type ToolOutputPartLike = {
  output?: unknown;
  state?: string;
};

export function collectToolOutputs<TSchema extends z.ZodTypeAny>(
  parts: ToolOutputPartLike[],
  schema: TSchema,
): Array<z.infer<TSchema>> {
  return parts.flatMap((part) => {
    if (part.state !== "output-available") {
      return [];
    }

    const parsed = schema.safeParse(part.output);
    return parsed.success ? [parsed.data] : [];
  });
}
