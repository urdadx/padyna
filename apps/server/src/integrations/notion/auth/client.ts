import { env } from "@padyna/env/server";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_OAUTH_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
export const NOTION_VERSION = "2026-03-11";

type NotionListResponse<T> = {
  object: "list";
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
};

export type NotionRichText = Array<{ plain_text?: string }>;

export type NotionPage = {
  object: "page";
  id: string;
  url?: string;
  public_url?: string | null;
  created_time?: string;
  last_edited_time?: string;
  parent?: {
    type?: string;
    data_source_id?: string;
    database_id?: string;
  };
  properties?: Record<string, any>;
};

export type NotionDataSource = {
  object: "data_source";
  id: string;
  title?: NotionRichText;
  url?: string;
  public_url?: string | null;
  created_time?: string;
  last_edited_time?: string;
};

export type NotionSearchResult = NotionPage | NotionDataSource;

export type NotionTokenResponse = {
  access_token: string;
  refresh_token: string;
  bot_id: string;
  duplicated_template_id?: string | null;
  owner: Record<string, unknown>;
  workspace_icon?: string | null;
  workspace_id: string;
  workspace_name?: string | null;
};

export type NotionMarkdownResponse = {
  object: string;
  id: string;
  markdown: string;
  truncated?: boolean;
  unknown_block_ids?: string[];
};

export class NotionApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "NotionApiError";
  }
}

function getOAuthClientConfig() {
  if (!env.NOTION_OAUTH_CLIENT_ID || !env.NOTION_OAUTH_CLIENT_SECRET) {
    throw new NotionApiError("Notion OAuth is not configured", 500);
  }

  return {
    clientId: env.NOTION_OAUTH_CLIENT_ID,
    clientSecret: env.NOTION_OAUTH_CLIENT_SECRET,
  };
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

function getBasicAuthHeader() {
  const { clientId, clientSecret } = getOAuthClientConfig();
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

export function getNotionAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = getOAuthClientConfig();
  const url = new URL(env.NOTION_AUTHORIZATION_URL ?? NOTION_OAUTH_AUTHORIZE_URL);

  url.searchParams.set("owner", "user");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeNotionAuthorizationCode(args: {
  code: string;
  redirectUri: string;
}): Promise<NotionTokenResponse> {
  const response = await fetch(`${NOTION_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getBasicAuthHeader(),
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new NotionApiError(
      "Failed to exchange Notion authorization code",
      response.status,
      details,
    );
  }

  return (await response.json()) as NotionTokenResponse;
}

export async function refreshNotionAccessToken(refreshToken: string): Promise<NotionTokenResponse> {
  const response = await fetch(`${NOTION_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getBasicAuthHeader(),
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new NotionApiError("Failed to refresh Notion access token", response.status, details);
  }

  return (await response.json()) as NotionTokenResponse;
}

async function notionRequest<T>(args: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}) {
  const response = await fetch(`${NOTION_API_BASE_URL}${args.path}`, {
    method: args.method ?? "GET",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: "application/json",
      "Notion-Version": NOTION_VERSION,
      ...(args.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(args.body ? { body: JSON.stringify(args.body) } : {}),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new NotionApiError("Notion request failed", response.status, details);
  }

  return (await response.json()) as T;
}

export async function searchNotionResources(args: {
  accessToken: string;
  query?: string;
  object?: "page" | "data_source";
  startCursor?: string;
  pageSize?: number;
}) {
  return notionRequest<NotionListResponse<NotionSearchResult>>({
    accessToken: args.accessToken,
    path: "/search",
    method: "POST",
    body: {
      ...(args.query ? { query: args.query } : {}),
      ...(args.object
        ? {
            filter: {
              property: "object",
              value: args.object,
            },
          }
        : {}),
      sort: {
        timestamp: "last_edited_time",
        direction: "descending",
      },
      ...(args.startCursor ? { start_cursor: args.startCursor } : {}),
      page_size: args.pageSize ?? 50,
    },
  });
}

export async function queryNotionDataSource(args: {
  accessToken: string;
  dataSourceId: string;
  startCursor?: string;
  pageSize?: number;
  resultType?: "page" | "data_source";
}) {
  return notionRequest<NotionListResponse<NotionSearchResult>>({
    accessToken: args.accessToken,
    path: `/data_sources/${encodeURIComponent(args.dataSourceId)}/query`,
    method: "POST",
    body: {
      ...(args.startCursor ? { start_cursor: args.startCursor } : {}),
      page_size: args.pageSize ?? 50,
      result_type: args.resultType ?? "page",
    },
  });
}

export async function retrieveNotionPageMarkdown(args: { accessToken: string; pageId: string }) {
  return notionRequest<NotionMarkdownResponse>({
    accessToken: args.accessToken,
    path: `/pages/${encodeURIComponent(args.pageId)}/markdown`,
  });
}

function richTextToPlainText(richText?: NotionRichText) {
  return (
    richText
      ?.map((part) => part.plain_text ?? "")
      .join("")
      .trim() ?? ""
  );
}

export function getNotionPageTitle(page: NotionPage) {
  const properties = page.properties ?? {};

  for (const property of Object.values(properties)) {
    if (property?.type === "title") {
      const title = richTextToPlainText(property.title);
      if (title) {
        return title;
      }
    }
  }

  return "Untitled Notion page";
}

export function getNotionDataSourceTitle(dataSource: NotionDataSource) {
  return richTextToPlainText(dataSource.title) || "Untitled Notion data source";
}

export function toNotionSelectableResource(resource: NotionSearchResult) {
  if (resource.object === "data_source") {
    return {
      id: resource.id,
      object: resource.object,
      title: getNotionDataSourceTitle(resource),
      url: resource.url ?? null,
      lastEditedTime: resource.last_edited_time ?? null,
    };
  }

  return {
    id: resource.id,
    object: resource.object,
    parentDataSourceId: resource.parent?.data_source_id ?? resource.parent?.database_id ?? null,
    title: getNotionPageTitle(resource),
    url: resource.url ?? null,
    lastEditedTime: resource.last_edited_time ?? null,
  };
}
