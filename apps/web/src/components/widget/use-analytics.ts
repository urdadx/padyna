import { useCallback } from "react";
import { trackEvent } from "@/lib/analytics/track";

type TrackableEvent = "widget_open" | "widget_close" | "chat_started" | "chat_message";

type UseAnalyticsOptions = {
  chatbotId: string | undefined;
  sessionIdRef: React.RefObject<string | null>;
  visitorIdRef: React.RefObject<string>;
};

export function useAnalytics({ chatbotId, sessionIdRef, visitorIdRef }: UseAnalyticsOptions) {
  const track = useCallback(
    async (event: TrackableEvent, extra?: { conversationId?: string }) => {
      if (!chatbotId || !sessionIdRef.current) return;

      try {
        await trackEvent({
          chatbotId,
          sessionId: sessionIdRef.current,
          visitorId: visitorIdRef.current,
          event,
          ...extra,
        });
      } catch (error) {
        console.error(`Failed to track ${event}:`, error);
      }
    },
    [chatbotId, sessionIdRef, visitorIdRef],
  );

  return { track };
}
