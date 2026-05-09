import { useEffect, useReducer, useRef } from "react";

export interface OverviewData {
  totalVisits: number;
  uniqueVisitors: number;
  totalChats: number;
  averageSessionTime: number;
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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const connect = async () => {
      if (mountedRef.current) updateState({ error: null });

      try {
        const response = await fetch(url, {
          credentials: "include",
          signal: abortController.signal,
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
        const decoder = new TextDecoder();

        let buffer = "";
        let eventType = "message";

        const processChunk = (value: Uint8Array) => {
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const raw = line.slice(6);
              try {
                const parsed = JSON.parse(raw);

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

        const readNext = async (): Promise<void> => {
          const { done, value } = await reader.read();

          if (done || abortController.signal.aborted) {
            return;
          }

          processChunk(value);
          await readNext();
        };

        await readNext();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        if (mountedRef.current) {
          updateState({
            isConnected: false,
            error: err instanceof Error ? err.message : "Connection failed",
          });
        }

        if (reconnectAttempt < MAX_RETRIES && !abortController.signal.aborted) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, reconnectAttempt);
          reconnectAttempt++;
          retryTimeout = setTimeout(connect, delay);
        }
      }
    };

    void connect();

    return () => {
      mountedRef.current = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      abortController.abort();
    };
  }, [timeRange, enabled]);

  return { data, isConnected, error };
}
