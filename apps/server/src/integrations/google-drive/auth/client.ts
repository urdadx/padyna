import { env } from "@padyna/env/server";

const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";

export type GoogleDriveTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GoogleDriveProfile = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
  parents?: string[];
};

export type GoogleDriveListResponse = {
  files: GoogleDriveFile[];
  nextPageToken?: string | null;
};

export class GoogleDriveApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "GoogleDriveApiError";
  }
}

function getOAuthClientConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new GoogleDriveApiError("Google Drive OAuth is not configured", 500);
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

export function getGoogleDriveAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = getOAuthClientConfig();
  const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DRIVE_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  return url.toString();
}

export async function exchangeGoogleDriveAuthorizationCode(args: {
  code: string;
  redirectUri: string;
}): Promise<GoogleDriveTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
      grant_type: "authorization_code",
      redirect_uri: args.redirectUri,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new GoogleDriveApiError(
      "Failed to exchange Google Drive authorization code",
      response.status,
      details,
    );
  }

  return (await response.json()) as GoogleDriveTokenResponse;
}

export async function refreshGoogleDriveAccessToken(
  refreshToken: string,
): Promise<GoogleDriveTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new GoogleDriveApiError(
      "Failed to refresh Google Drive access token",
      response.status,
      details,
    );
  }

  return (await response.json()) as GoogleDriveTokenResponse;
}

async function googleRequest<T>(args: {
  accessToken: string;
  url: string;
  responseType?: "json" | "arrayBuffer";
}) {
  const response = await fetch(args.url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: args.responseType === "arrayBuffer" ? "*/*" : "application/json",
    },
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    console.error("Google Drive API request failed", {
      status: response.status,
      url: args.url,
      details,
    });
    throw new GoogleDriveApiError("Google Drive request failed", response.status, details);
  }

  if (args.responseType === "arrayBuffer") {
    return (await response.arrayBuffer()) as T;
  }

  return (await response.json()) as T;
}

export async function getGoogleDriveProfile(accessToken: string) {
  return googleRequest<GoogleDriveProfile>({ accessToken, url: GOOGLE_USERINFO_URL });
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function isSupportedGoogleDriveFile(file: Pick<GoogleDriveFile, "mimeType" | "name">) {
  const name = file.name.toLowerCase();
  return (
    file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE ||
    file.mimeType === GOOGLE_DOC_MIME_TYPE ||
    file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimeType === "application/pdf" ||
    file.mimeType === "text/plain" ||
    file.mimeType === "text/markdown" ||
    name.endsWith(".docx") ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  );
}

export async function listGoogleDriveFiles(args: {
  accessToken: string;
  folderId?: string;
  query?: string;
  pageToken?: string;
  pageSize?: number;
}) {
  const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/files`);
  const clauses = ["trashed = false"];

  if (args.folderId) {
    clauses.push(`'${escapeDriveQueryValue(args.folderId)}' in parents`);
  }

  if (args.query) {
    clauses.push(`name contains '${escapeDriveQueryValue(args.query)}'`);
  }

  url.searchParams.set("q", clauses.join(" and "));
  url.searchParams.set(
    "fields",
    "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size,parents)",
  );
  url.searchParams.set("orderBy", "folder,name");
  url.searchParams.set("pageSize", String(args.pageSize ?? 100));
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  if (args.pageToken) {
    url.searchParams.set("pageToken", args.pageToken);
  }

  const response = await googleRequest<GoogleDriveListResponse>({
    accessToken: args.accessToken,
    url: url.toString(),
  });
  return {
    ...response,
    files: response.files.filter(isSupportedGoogleDriveFile),
  };
}

export async function getGoogleDriveFile(args: { accessToken: string; fileId: string }) {
  const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/files/${encodeURIComponent(args.fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,modifiedTime,webViewLink,size,parents");
  url.searchParams.set("supportsAllDrives", "true");
  return googleRequest<GoogleDriveFile>({ accessToken: args.accessToken, url: url.toString() });
}

export async function downloadGoogleDriveFile(args: {
  accessToken: string;
  file: GoogleDriveFile;
}) {
  const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/files/${encodeURIComponent(args.file.id)}`);
  url.searchParams.set("supportsAllDrives", "true");

  if (args.file.mimeType === GOOGLE_DOC_MIME_TYPE) {
    url.pathname += "/export";
    url.searchParams.set(
      "mimeType",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  } else {
    url.searchParams.set("alt", "media");
  }

  return googleRequest<ArrayBuffer>({
    accessToken: args.accessToken,
    url: url.toString(),
    responseType: "arrayBuffer",
  });
}
