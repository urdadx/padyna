// Messages from the page embedding the widget (sent by the Padyna SDK).
//
// The SDK posts `padyna:widget_open` from the iframe's load event, but the
// widget only knows its chatbot once its config has loaded, a round trip
// later. A listener added then would miss that first open, so the widget never
// started a session or counted as a live user. This listens from app start-up
// and remembers whether the widget is open for whoever subscribes later.

export type HostMessageType = "padyna:widget_open" | "padyna:widget_close" | "parent-page-unload";

const HOST_MESSAGE_TYPES = new Set<string>([
  "padyna:widget_open",
  "padyna:widget_close",
  "parent-page-unload",
]);

type MessageSource = Pick<Window, "addEventListener" | "parent">;

export function createWidgetHostChannel(target: MessageSource) {
  let open = false;
  const listeners = new Set<(type: HostMessageType) => void>();

  target.addEventListener("message", (event: MessageEvent) => {
    // Only the embedding page may drive the widget; ignore other frames and scripts.
    if (target.parent === (target as unknown) || event.source !== target.parent) return;

    const type = (event.data as { type?: unknown } | null)?.type;
    if (typeof type !== "string" || !HOST_MESSAGE_TYPES.has(type)) return;

    open = type === "padyna:widget_open";
    for (const listener of listeners) listener(type as HostMessageType);
  });

  return {
    /** Whether the host's latest message opened the widget. */
    isOpen: () => open,
    subscribe(listener: (type: HostMessageType) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Started on import; `main.tsx` imports this before rendering the app. */
export const widgetHost =
  typeof window === "undefined"
    ? createWidgetHostChannel({ addEventListener: () => {}, parent: null } as unknown as MessageSource)
    : createWidgetHostChannel(window);
