export type WebActionProvider = "jira" | "calendly" | "clickup" | "discord" | "slack";

export type JiraActionConfig = {
  projectId: string;
  projectKey: string;
  projectName: string;
  issueTypeId: string;
  issueTypeName: string;
};

export type CalendlyActionConfig = {
  eventTypeUri: string;
  eventTypeName: string;
  schedulingUrl: string | null;
  duration: number | null;
};

export type ClickUpActionConfig = {
  workspaceId: string;
  workspaceName: string;
  spaceId: string;
  spaceName: string;
  listId: string;
  listName: string;
};

export type DiscordActionConfig = {
  channelId: string;
  channelName: string;
  parentName: string | null;
  audience?: "none" | "here" | "everyone";
};

export type SlackActionConfig = {
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  audience?: "channel" | "here" | "everyone";
};

export type WebActionConfig =
  | JiraActionConfig
  | CalendlyActionConfig
  | ClickUpActionConfig
  | DiscordActionConfig
  | SlackActionConfig;

export type ActionFormMode = "create" | "edit";

export type ActionFormInitialData<TConfig> = {
  id: string;
  provider: WebActionProvider;
  name: string;
  description: string;
  enabled: boolean;
  config: TConfig;
};

export type ActionFormProps<TConfig> = {
  mode?: ActionFormMode;
  actionId?: string;
  initialAction?: ActionFormInitialData<TConfig>;
};

export type WebActionRecord = ActionFormInitialData<WebActionConfig>;
