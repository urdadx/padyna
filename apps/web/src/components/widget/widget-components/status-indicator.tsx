import { cn } from "@/lib/utils";

type WidgetStatusIndicatorProps = {
  label: string;
  className?: string;
};

export function WidgetStatusIndicator({ label, className }: WidgetStatusIndicatorProps) {
  return <span className={cn("animate-pulse text-sm text-neutral-500", className)}>{label}</span>;
}
