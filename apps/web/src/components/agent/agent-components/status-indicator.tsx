import { cn } from "@/lib/utils";

type StatusIndicatorProps = {
	label: string;
	className?: string;
};

export function StatusIndicator({ label, className }: StatusIndicatorProps) {
	return (
		<span className={cn("animate-pulse text-sm text-neutral-500", className)}>{label}</span>
	);
}
