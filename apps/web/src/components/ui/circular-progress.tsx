import type { CSSProperties, ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type CircularProgressProps = ComponentPropsWithoutRef<"div"> & {
	value: number;
	max?: number;
	size?: number;
	strokeWidth?: number;
	showValueLabel?: boolean;
	trackClassName?: string;
	indicatorClassName?: string;
	valueLabelClassName?: string;
	formatValueLabel?: (percentage: number) => string;
};

const VIEWBOX_SIZE = 24;
const CENTER = VIEWBOX_SIZE / 2;
const DEFAULT_SIZE = 40;
const DEFAULT_STROKE_WIDTH = 2.5;

export function CircularProgress({
	className,
	value,
	max = 100,
	size = DEFAULT_SIZE,
	strokeWidth = DEFAULT_STROKE_WIDTH,
	showValueLabel = false,
	trackClassName,
	indicatorClassName,
	valueLabelClassName,
	formatValueLabel,
	style,
	...props
}: CircularProgressProps) {
	const safeMax = max > 0 ? max : 1;
	const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);
	const radius = CENTER - strokeWidth * 1.5;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - percentage / 100);

	return (
		<div
			aria-valuemax={safeMax}
			aria-valuemin={0}
			aria-valuenow={Math.min(Math.max(value, 0), safeMax)}
			className={cn(
				"relative inline-flex shrink-0 items-center justify-center",
				className,
			)}
			role="progressbar"
			style={{ height: size, width: size, ...style } as CSSProperties}
			{...props}>
			<svg
				aria-hidden="true"
				className="size-full -rotate-90"
				viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
				<circle
					className={cn("text-muted/60", trackClassName)}
					cx={CENTER}
					cy={CENTER}
					fill="none"
					r={radius}
					stroke="currentColor"
					strokeWidth={strokeWidth}
				/>
				<circle
					className={cn("text-emerald-500 transition-all", indicatorClassName)}
					cx={CENTER}
					cy={CENTER}
					fill="none"
					r={radius}
					stroke="currentColor"
					strokeDasharray={circumference}
					strokeDashoffset={dashOffset}
					strokeLinecap="round"
					strokeWidth={strokeWidth}
				/>
			</svg>

			{showValueLabel ? (
				<span
					className={cn(
						"absolute text-[10px] font-medium leading-none text-foreground",
						valueLabelClassName,
					)}>
					{formatValueLabel
						? formatValueLabel(percentage)
						: `${Math.round(percentage)}%`}
				</span>
			) : null}
		</div>
	);
}
