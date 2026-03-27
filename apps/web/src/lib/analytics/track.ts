import { trpcClient } from "@/utils/trpc";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getSessionStorageKey(chatbotId: string): string {
  return `padyna_session_${chatbotId}`;
}

function getSessionData(chatbotId: string): { sessionId: string; startedAt: number } | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(getSessionStorageKey(chatbotId));
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getStoredSessionId(chatbotId: string): string | null {
  const sessionData = getSessionData(chatbotId);
  if (!sessionData) return null;

  const now = Date.now();
  if (now - sessionData.startedAt > SESSION_TIMEOUT_MS) {
    clearStoredSession(chatbotId);
    return null;
  }

  return sessionData.sessionId;
}

export function setStoredSession(chatbotId: string, sessionId: string): void {
  if (typeof window === "undefined") return;
  const data = { sessionId, startedAt: Date.now() };
  localStorage.setItem(getSessionStorageKey(chatbotId), JSON.stringify(data));
}

export function clearStoredSession(chatbotId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSessionStorageKey(chatbotId));
}

export function updateSessionActivity(chatbotId: string): void {
  const sessionData = getSessionData(chatbotId);
  if (!sessionData) return;
  sessionData.startedAt = Date.now();
  localStorage.setItem(getSessionStorageKey(chatbotId), JSON.stringify(sessionData));
}

const AnalyticsEvents = [
  "session_start",
  "session_end",
  "page_view",
  "chat_started",
  "chat_message",
  "widget_open",
  "widget_close",
] as const;

type AnalyticsEvent = (typeof AnalyticsEvents)[number];

export async function createSession(input: {
  chatbotId: string;
  visitorId: string;
  userAgent?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  platform?: string;
}) {
  return trpcClient.analytics.createSession.mutate(input);
}

export async function endSession(input: {
  sessionId: string;
  chatbotId: string;
  durationMs?: number;
  pageViews?: number;
  isBounce?: boolean;
}) {
  return trpcClient.analytics.endSession.mutate(input);
}

export async function trackEvent(input: {
  chatbotId: string;
  sessionId: string;
  visitorId: string;
  event: AnalyticsEvent;
  durationMs?: number;
  conversationId?: string;
  extra?: Record<string, unknown>;
}) {
  return trpcClient.analytics.trackEvent.mutate(input);
}

export async function setWidgetActive(sessionId: string, chatbotId: string) {
  return trpcClient.analytics.setWidgetActive.mutate({ sessionId, chatbotId });
}

export async function setWidgetInactive(sessionId: string, chatbotId: string) {
  return trpcClient.analytics.setWidgetInactive.mutate({ sessionId, chatbotId });
}
