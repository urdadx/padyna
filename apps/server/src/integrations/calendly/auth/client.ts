import { env } from "@padyna/env/server";

const CALENDLY_AUTH_BASE_URL = "https://auth.calendly.com";
const CALENDLY_API_BASE_URL = "https://api.calendly.com";

export type CalendlyTokenResponse = {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  scope?: string;
  created_at: number;
  expires_in: number;
  owner: string;
  organization: string;
};

export type CalendlyCurrentUserResponse = {
  resource: {
    uri: string;
    current_organization: string;
    name: string;
    email: string;
    scheduling_url?: string;
    timezone?: string;
  };
};

export type CalendlyEventType = {
  uri: string;
  name: string;
  active: boolean;
  booking_method?: string;
  scheduling_url?: string;
  duration?: number;
  kind?: string;
  slug?: string;
  type?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  description_plain?: string;
  description_html?: string;
  profile?: Record<string, unknown>;
  locations?: Record<string, unknown>[];
  custom_questions?: Record<string, unknown>[];
  locale?: string;
};

export type CalendlyEventTypesResponse = {
  collection: CalendlyEventType[];
  pagination?: {
    next_page?: string | null;
    next_page_token?: string | null;
  };
};

export class CalendlyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "CalendlyApiError";
  }
}

function getOAuthClientConfig() {
  if (!env.CALENDLY_CLIENT_ID || !env.CALENDLY_CLIENT_SECRET) {
    throw new CalendlyApiError("Calendly OAuth is not configured", 500);
  }

  return {
    clientId: env.CALENDLY_CLIENT_ID,
    clientSecret: env.CALENDLY_CLIENT_SECRET,
  };
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${token}`;
}

export function getCalendlyAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = getOAuthClientConfig();

  const url = new URL(`${CALENDLY_AUTH_BASE_URL}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

export async function exchangeCalendlyAuthorizationCode(args: {
  code: string;
  redirectUri: string;
}): Promise<CalendlyTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
  });

  const response = await fetch(`${CALENDLY_AUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new CalendlyApiError(
      "Failed to exchange Calendly authorization code",
      response.status,
      details,
    );
  }

  return (await response.json()) as CalendlyTokenResponse;
}

export async function refreshCalendlyAccessToken(
  refreshToken: string,
): Promise<CalendlyTokenResponse> {
  const { clientId, clientSecret } = getOAuthClientConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${CALENDLY_AUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new CalendlyApiError("Failed to refresh Calendly access token", response.status, details);
  }

  return (await response.json()) as CalendlyTokenResponse;
}

export async function getCalendlyCurrentUser(
  accessToken: string,
): Promise<CalendlyCurrentUserResponse["resource"]> {
  const response = await fetch(`${CALENDLY_API_BASE_URL}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new CalendlyApiError("Failed to fetch Calendly current user", response.status, details);
  }

  const payload = (await response.json()) as CalendlyCurrentUserResponse;
  return payload.resource;
}

export async function getCalendlyEventTypes(
  accessToken: string,
  userUri: string,
): Promise<CalendlyEventType[]> {
  const eventTypes: CalendlyEventType[] = [];
  let nextUrl: string | null =
    `${CALENDLY_API_BASE_URL}/event_types?user=${encodeURIComponent(userUri)}`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const details = await parseErrorResponse(response);
      throw new CalendlyApiError("Failed to fetch Calendly event types", response.status, details);
    }

    const payload = (await response.json()) as CalendlyEventTypesResponse;
    eventTypes.push(...payload.collection);

    nextUrl = payload.pagination?.next_page ?? null;
  }

  return eventTypes;
}
