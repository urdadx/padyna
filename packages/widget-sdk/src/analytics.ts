export interface SessionInfo {
  sessionId: string;
  visitorId: string;
  chatbotId: string;
}

export interface AnalyticsConfig {
  serverUrl: string;
  widgetId: string;
  chatbotId?: string;
}

const VISITOR_COOKIE = "padyna_visitor";
const COOKIE_EXPIRY_DAYS = 365;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (!match || !match[2]) return null;
  return decodeURIComponent(match[2]);
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const hostname = window.location.hostname;
  const domain = hostname.includes(".")
    ? "; domain=" + hostname.split(".").slice(-2).join(".")
    : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${domain}`;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateVisitorId(): string {
  let visitorId = getCookie(VISITOR_COOKIE);
  if (!visitorId) {
    visitorId = generateUUID();
    setCookie(VISITOR_COOKIE, visitorId, COOKIE_EXPIRY_DAYS);
  }
  return visitorId;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function createSession(
  config: AnalyticsConfig,
  chatbotId: string,
): Promise<SessionInfo> {
  const visitorId = getOrCreateVisitorId();

  const response = await fetchJSON<{ id: string }>(
    `${config.serverUrl}/api/trpc/analytics.createSession`,
    {
      method: "POST",
      body: JSON.stringify({
        chatbotId,
        visitorId,
      }),
    },
  );

  return {
    sessionId: response.id,
    visitorId,
    chatbotId,
  };
}

export async function trackEvent(
  config: AnalyticsConfig,
  sessionInfo: SessionInfo,
  event:
    | "widget_open"
    | "widget_close"
    | "session_start"
    | "session_end"
    | "page_view"
    | "chat_started"
    | "chat_message",
  extra?: { durationMs?: number },
): Promise<void> {
  await fetchJSON(`${config.serverUrl}/api/trpc/analytics.trackEvent`, {
    method: "POST",
    body: JSON.stringify({
      chatbotId: sessionInfo.chatbotId,
      sessionId: sessionInfo.sessionId,
      visitorId: sessionInfo.visitorId,
      event,
      ...extra,
    }),
  });
}

export async function endSession(
  config: AnalyticsConfig,
  sessionInfo: SessionInfo,
  extra?: { durationMs?: number; isBounce?: boolean },
): Promise<void> {
  await Promise.all([
    trackEvent(config, sessionInfo, "session_end", extra),
    fetchJSON(`${config.serverUrl}/api/trpc/analytics.endSession`, {
      method: "POST",
      body: JSON.stringify({
        sessionId: sessionInfo.sessionId,
        ...extra,
      }),
    }),
  ]);
}
