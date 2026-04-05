import { env } from "@padyna/env/server";

const JIRA_AUTH_BASE_URL = "https://auth.atlassian.com";
const JIRA_API_BASE_URL = "https://api.atlassian.com";
const JIRA_REQUIRED_SCOPES = ["read:jira-work", "write:jira-work"] as const;
const JIRA_AUTHORIZATION_SCOPES = [...JIRA_REQUIRED_SCOPES, "offline_access"] as const;

export type JiraTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: "Bearer";
};

export type JiraAccessibleResource = {
  id: string;
  name: string;
  url: string;
  scopes?: string[];
  avatarUrl?: string;
};

export type JiraProjectSearchResponse = {
  isLast: boolean;
  maxResults: number;
  nextPage?: string;
  self: string;
  startAt: number;
  total: number;
  values: Array<{
    id: string;
    key: string;
    name: string;
    self: string;
    style?: string;
    simplified?: boolean;
    avatarUrls?: Record<string, string>;
    insight?: Record<string, unknown>;
    projectCategory?: Record<string, unknown>;
  }>;
};

export type JiraIssueType = {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  subtask?: boolean;
  entityId?: string;
  self?: string;
  scope?: Record<string, unknown>;
  hierarchyLevel?: number;
};

export type JiraCreateMetaIssueTypesResponse = {
  issueTypes: JiraIssueType[];
  maxResults: number;
  startAt: number;
  total: number;
};

export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

function getOAuthClientConfig() {
  if (!env.JIRA_CLIENT_ID || !env.JIRA_CLIENT_SECRET) {
    throw new JiraApiError("Jira OAuth is not configured", 500);
  }

  return {
    clientId: env.JIRA_CLIENT_ID,
    clientSecret: env.JIRA_CLIENT_SECRET,
  };
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

function hasRequiredScopes(scopes?: string[]) {
  if (!Array.isArray(scopes)) {
    return false;
  }

  return JIRA_REQUIRED_SCOPES.every((scope) => scopes.includes(scope));
}

export function getJiraAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = getOAuthClientConfig();

  const url = new URL(`${JIRA_AUTH_BASE_URL}/authorize`);
  url.searchParams.set("audience", "api.atlassian.com");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", JIRA_AUTHORIZATION_SCOPES.join(" "));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

export async function exchangeJiraAuthorizationCode(args: {
  code: string;
  redirectUri: string;
}): Promise<JiraTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();

  const response = await fetch(`${JIRA_AUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new JiraApiError("Failed to exchange Jira authorization code", response.status, details);
  }

  return (await response.json()) as JiraTokenResponse;
}

export async function refreshJiraAccessToken(refreshToken: string): Promise<JiraTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();

  const response = await fetch(`${JIRA_AUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new JiraApiError("Failed to refresh Jira access token", response.status, details);
  }

  return (await response.json()) as JiraTokenResponse;
}

export async function getJiraAccessibleResources(
  accessToken: string,
): Promise<JiraAccessibleResource[]> {
  const response = await fetch(`${JIRA_API_BASE_URL}/oauth/token/accessible-resources`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new JiraApiError("Failed to fetch Jira accessible resources", response.status, details);
  }

  return (await response.json()) as JiraAccessibleResource[];
}

export function selectJiraAccessibleResource(resources: JiraAccessibleResource[]) {
  return resources.find((resource) => hasRequiredScopes(resource.scopes)) ?? null;
}

async function jiraRequest<T>(args: {
  accessToken: string;
  cloudId: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}) {
  const response = await fetch(
    `${JIRA_API_BASE_URL}/ex/jira/${encodeURIComponent(args.cloudId)}${args.path}`,
    {
      method: args.method ?? "GET",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        Accept: "application/json",
        ...(args.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(args.body ? { body: JSON.stringify(args.body) } : {}),
    },
  );

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new JiraApiError("Jira request failed", response.status, details);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function getJiraProjects(args: {
  accessToken: string;
  cloudId: string;
  startAt?: number;
  maxResults?: number;
  query?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("action", "create");

  if (typeof args.startAt === "number") {
    searchParams.set("startAt", String(args.startAt));
  }

  if (typeof args.maxResults === "number") {
    searchParams.set("maxResults", String(args.maxResults));
  }

  if (args.query) {
    searchParams.set("query", args.query);
  }

  return jiraRequest<JiraProjectSearchResponse>({
    accessToken: args.accessToken,
    cloudId: args.cloudId,
    path: `/rest/api/3/project/search?${searchParams.toString()}`,
  });
}

export async function getJiraIssueTypes(args: {
  accessToken: string;
  cloudId: string;
  projectId: string;
}) {
  const searchParams = new URLSearchParams({ projectId: args.projectId });

  return jiraRequest<JiraIssueType[]>({
    accessToken: args.accessToken,
    cloudId: args.cloudId,
    path: `/rest/api/3/issuetype/project?${searchParams.toString()}`,
  });
}

export async function getJiraCreateMetaIssueTypes(args: {
  accessToken: string;
  cloudId: string;
  projectIdOrKey: string;
}) {
  return jiraRequest<JiraCreateMetaIssueTypesResponse>({
    accessToken: args.accessToken,
    cloudId: args.cloudId,
    path: `/rest/api/3/issue/createmeta/${encodeURIComponent(args.projectIdOrKey)}/issuetypes`,
  });
}

function toAtlaskitDocument(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export async function createJiraIssue(args: {
  accessToken: string;
  cloudId: string;
  projectId: string;
  issueTypeId: string;
  summary: string;
  description?: string;
  priorityId?: string;
}) {
  const fields: Record<string, unknown> = {
    project: {
      id: args.projectId,
    },
    issuetype: {
      id: args.issueTypeId,
    },
    summary: args.summary,
  };

  if (args.description) {
    // Jira expects rich-text document content for description.
    fields.description = toAtlaskitDocument(args.description);
  }

  if (args.priorityId) {
    fields.priority = {
      id: args.priorityId,
    };
  }

  return jiraRequest<{ id: string; key: string; self: string }>({
    accessToken: args.accessToken,
    cloudId: args.cloudId,
    method: "POST",
    path: "/rest/api/3/issue",
    body: {
      fields,
      update: {},
    },
  });
}
