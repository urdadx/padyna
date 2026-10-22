import { cn } from "@/lib/utils";
import { StatusIndicator } from "./status-indicator";

type LiveTypingIndicatorProps = {
  visible: boolean;
  label: string;
  className?: string;
};

/**
 * "… is typing" for live chat. It stays mounted and only fades, inside space
 * the message list reserves for it, so the other side starting and stopping
 * typing never changes the list's height (which made the messages jump).
 */
export function LiveTypingIndicator({ visible, label, className }: LiveTypingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none w-fit rounded-2xl rounded-br bg-muted/40 px-3 py-2 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {visible ? <StatusIndicator label={label} /> : null}
    </div>
  );
}
