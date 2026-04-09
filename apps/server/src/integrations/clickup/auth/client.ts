import { env } from "@padyna/env/server";

const CLICKUP_AUTH_BASE_URL = "https://app.clickup.com/api";
const CLICKUP_API_BASE_URL = "https://api.clickup.com/api/v2";
const CLICKUP_DEFAULT_TASK_TAGS = ["ai support bot", "padyna"] as const;

export type ClickUpTokenResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
};

export type ClickUpWorkspaceResponse = {
  teams: Array<{
    id: string;
    name: string;
    color?: string | null;
    avatar?: string | null;
  }>;
};

export type ClickUpSpacesResponse = {
  spaces: Array<Record<string, unknown>>;
};

export type ClickUpFoldersResponse = {
  folders: Array<Record<string, unknown>>;
};

export type ClickUpListsResponse = {
  lists: Array<Record<string, unknown>>;
};

export type ClickUpListResponse = Record<string, unknown>;

export type ClickUpTaskResponse = Record<string, unknown>;

export class ClickUpApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ClickUpApiError";
  }
}

function getOAuthClientConfig() {
  if (!env.CLICKUP_CLIENT_ID || !env.CLICKUP_CLIENT_SECRET) {
    throw new ClickUpApiError("ClickUp OAuth is not configured", 500);
  }

  return {
    clientId: env.CLICKUP_CLIENT_ID,
    clientSecret: env.CLICKUP_CLIENT_SECRET,
  };
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

export function getClickUpAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = getOAuthClientConfig();

  const url = new URL(CLICKUP_AUTH_BASE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeClickUpAuthorizationCode(args: {
  code: string;
  redirectUri: string;
}): Promise<ClickUpTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();

  const response = await fetch(`${CLICKUP_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ClickUpApiError(
      "Failed to exchange ClickUp authorization code",
      response.status,
      details,
    );
  }

  return (await response.json()) as ClickUpTokenResponse;
}

async function clickupRequest<T>(args: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}) {
  const response = await fetch(`${CLICKUP_API_BASE_URL}${args.path}`, {
    method: args.method ?? "GET",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: "application/json",
      ...(args.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(args.body ? { body: JSON.stringify(args.body) } : {}),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ClickUpApiError("ClickUp request failed", response.status, details);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function getClickUpWorkspaces(accessToken: string) {
  return clickupRequest<ClickUpWorkspaceResponse>({
    accessToken,
    path: "/team",
  });
}

export async function getClickUpSpaces(args: { accessToken: string; workspaceId: string }) {
  return clickupRequest<ClickUpSpacesResponse>({
    accessToken: args.accessToken,
    path: `/team/${encodeURIComponent(args.workspaceId)}/space`,
  });
}

export async function getClickUpFolders(args: { accessToken: string; spaceId: string }) {
  return clickupRequest<ClickUpFoldersResponse>({
    accessToken: args.accessToken,
    path: `/space/${encodeURIComponent(args.spaceId)}/folder`,
  });
}

export async function getClickUpFolderlessLists(args: { accessToken: string; spaceId: string }) {
  return clickupRequest<ClickUpListsResponse>({
    accessToken: args.accessToken,
    path: `/space/${encodeURIComponent(args.spaceId)}/list`,
  });
}

export async function getClickUpList(args: { accessToken: string; listId: string }) {
  return clickupRequest<ClickUpListResponse>({
    accessToken: args.accessToken,
    path: `/list/${encodeURIComponent(args.listId)}`,
  });
}

export async function createClickUpTask(args: {
  accessToken: string;
  listId: string;
  name: string;
  description?: string;
  markdownDescription?: string;
}) {
  return clickupRequest<ClickUpTaskResponse>({
    accessToken: args.accessToken,
    method: "POST",
    path: `/list/${encodeURIComponent(args.listId)}/task`,
    body: {
      name: args.name,
      ...(args.description ? { description: args.description } : {}),
      ...(args.markdownDescription
        ? { markdown_description: args.markdownDescription }
        : {}),
      tags: [...CLICKUP_DEFAULT_TASK_TAGS],
      archived: false,
    },
  });
}
