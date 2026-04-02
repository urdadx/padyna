import { useRef, useCallback, useEffect } from "react";
import {
  createSession,
  endSession,
  setStoredSession,
  clearStoredSession,
  setWidgetActive,
  setWidgetInactive,
} from "@/lib/analytics/track";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor";

type UseWidgetSessionOptions = {
  chatbotId: string | undefined;
  isEnabled: boolean | undefined;
  chatId: string | undefined;
};

export function useWidgetSession({ chatbotId, isEnabled, chatId }: UseWidgetSessionOptions) {
  const sessionIdRef = useRef<string | null>(null);
  const visitorIdRef = useRef<string>("");
  const chatStartedRef = useRef<boolean>(false);
  const sessionStartTimeRef = useRef<number>(0);
  const isSessionEndedRef = useRef<boolean>(false);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose refs needed by analytics hook
  const sessionId = sessionIdRef;
  const visitorId = visitorIdRef;
  const chatStarted = chatStartedRef;

  const endCurrentSession = useCallback(async () => {
    if (!sessionIdRef.current || !chatbotId || isSessionEndedRef.current) {
      return;
    }

    isSessionEndedRef.current = true;

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

    const durationMs = Date.now() - sessionStartTimeRef.current;
    const isBounce = !chatStartedRef.current;

    try {
      await Promise.all([
        setWidgetInactive(sessionIdRef.current, chatbotId),
        endSession({ sessionId: sessionIdRef.current, chatbotId, durationMs, isBounce }),
      ]);
    } catch (error) {
      console.error("Failed to end session:", error);
    }

    clearStoredSession(chatbotId);
    sessionIdRef.current = null;
  }, [chatbotId]);

  const openSession = useCallback(async () => {
    if (!chatbotId) return;

    isSessionEndedRef.current = false;

    if (!visitorIdRef.current) {
      visitorIdRef.current = getOrCreateVisitorId();
    }

    if (!sessionIdRef.current) {
      try {
        const session = await createSession({ chatbotId, visitorId: visitorIdRef.current });
        sessionIdRef.current = session.id;
        sessionStartTimeRef.current = Date.now();
        setStoredSession(chatbotId, session.id);
        await setWidgetActive(session.id, chatbotId);
      } catch (error) {
        console.error("Failed to create session on widget_open:", error);
        return;
      }
    } else {
      try {
        await setWidgetActive(sessionIdRef.current, chatbotId);
      } catch (error) {
        console.error("Failed to set widget active:", error);
      }
    }
  }, [chatbotId]);

  const resetChatStarted = useCallback(() => {
    chatStartedRef.current = false;
  }, []);

  // Reset chatStarted when chatId changes
  useEffect(() => {
    if (chatId) {
      chatStartedRef.current = false;
    }
  }, [chatId]);

  // Visibility change listener
  useEffect(() => {
    if (!chatbotId || !isEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        visibilityTimeoutRef.current = setTimeout(async () => {
          await endCurrentSession();
        }, 1000);
      } else {
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [chatbotId, isEnabled, endCurrentSession]);

  // postMessage listener for widget open/close events
  useEffect(() => {
    if (!chatbotId || !isEnabled) return;

    const handleMessage = async (event: MessageEvent) => {
      const type = (event.data as { type?: string })?.type;

      if (type === "padyna:widget_open") {
        await openSession();
        return;
      }

      if (type === "padyna:widget_close" || type === "parent-page-unload") {
        await endCurrentSession();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [chatbotId, isEnabled, openSession, endCurrentSession]);

  return {
    sessionId,
    visitorId,
    chatStarted,
    endCurrentSession,
    resetChatStarted,
  };
}
