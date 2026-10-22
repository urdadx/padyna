import { useEffect, useReducer, useRef } from "react";

export interface OverviewData {
  totalVisits: number;
  uniqueVisitors: number;
  totalChats: number;
  averageSessionTime: number;
  /** 0..1 */
  bounceRate: number;
  activeVisitors: number;
}

interface UseOverviewStreamOptions {
  timeRange: string;
  enabled?: boolean;
}

interface UseOverviewStreamResult {
  data: OverviewData | null;
  isConnected: boolean;
  error: string | null;
}

type OverviewStreamState = {
  data: OverviewData | null;
  isConnected: boolean;
  error: string | null;
};

function overviewStreamReducer(state: OverviewStreamState, action: Partial<OverviewStreamState>) {
  return { ...state, ...action };
}

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1_000;

export function useOverviewStream({
  timeRange,
  enabled = true,
}: UseOverviewStreamOptions): UseOverviewStreamResult {
  const [state, updateState] = useReducer(overviewStreamReducer, {
    data: null,
    isConnected: false,
    error: null,
  });
  const { data, error, isConnected } = state;

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      return;
    }

    const baseUrl = import.meta.env.VITE_SERVER_URL ?? "";
    const url = `${baseUrl}/api/analytics/stream/overview?timeRange=${encodeURIComponent(timeRange)}`;

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let streamController: AbortController | null = null;

    const parseChunk = (() => {
      let buffer = "";
      let eventType = "message";
      const decoder = new TextDecoder();

      return (value: Uint8Array) => {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));

              if (eventType === "overview") {
                if (mountedRef.current) updateState({ data: parsed as OverviewData });
              } else if (eventType === "error") {
                console.error("[useOverviewStream] server error event:", parsed);
                if (mountedRef.current) {
                  updateState({
                    error: (parsed as { error?: string }).error ?? "Unknown server error",
                  });
                }
              }
            } catch {}

            eventType = "message";
          } else if (line === "") {
            eventType = "message";
          }
        }
      };
    })();

    const scheduleReconnect = (delay: number) => {
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(connect, delay);
    };

    async function connect() {
      retryTimeout = null;
      // A hidden tab doesn't hold a stream open; it reconnects when shown.
      if (document.hidden) {
        streamController = null;
        return;
      }

      streamController?.abort();
      const controller = new AbortController();
      streamController = controller;
      abortControllerRef.current = controller;

      try {
        const response = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        if (mountedRef.current) {
          updateState({ isConnected: true, error: null });
        }

        reconnectAttempt = 0;

        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;
          parseChunk(value);
        }

        // The server ends each stream after a while; pick up a fresh one.
        if (!controller.signal.aborted && mountedRef.current) {
          streamController = null;
          scheduleReconnect(0);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        streamController = null;

        if (mountedRef.current) {
          updateState({
            isConnected: false,
            error: err instanceof Error ? err.message : "Connection failed",
          });
        }

        if (reconnectAttempt < MAX_RETRIES) {
          scheduleReconnect(BASE_RETRY_DELAY_MS * Math.pow(2, reconnectAttempt));
          reconnectAttempt++;
        }
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (retryTimeout) clearTimeout(retryTimeout);
        retryTimeout = null;
        streamController?.abort();
        streamController = null;
        if (mountedRef.current) updateState({ isConnected: false });
      } else if (!streamController) {
        reconnectAttempt = 0;
        if (retryTimeout) clearTimeout(retryTimeout);
        void connect();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void connect();

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (retryTimeout) clearTimeout(retryTimeout);
      streamController?.abort();
    };
  }, [timeRange, enabled]);

  return { data, isConnected, error };
}
