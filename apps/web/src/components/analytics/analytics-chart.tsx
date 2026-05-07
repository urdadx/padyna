import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

export type AnalyticsChartDatum = {
	date: string;
	visitors: number;
	chats: number;
};

export const EMPTY_ANALYTICS_CHART_DATA: AnalyticsChartDatum[] = [
	{ date: "2026-01-03", visitors: 24, chats: 20 },
	{ date: "2026-01-04", visitors: 31, chats: 75 },
	{ date: "2026-01-05", visitors: 28, chats: 40 },
	{ date: "2026-01-06", visitors: 36, chats: 35 },
	{ date: "2026-01-07", visitors: 42, chats: 58 },
	{ date: "2026-01-08", visitors: 34, chats: 64 },
	{ date: "2026-01-09", visitors: 39, chats: 16 },
];

interface AnalyticsChartProps {
	config: ChartConfig;
	data: AnalyticsChartDatum[];
	hasData: boolean;
	className?: string;
	showVisitors?: boolean;
	showChats?: boolean;
	emptyText?: string;
}

const formatDateLabel = (value: string) => {
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
};

export function AnalyticsChart({
	config,
	data,
	hasData,
	className,
	showVisitors = true,
	showChats = true,
	emptyText = "No data available yet",
}: AnalyticsChartProps) {
	const fillChatsId = useId().replace(/:/g, "");
	const fillVisitorsId = useId().replace(/:/g, "");
	const displayedData = hasData ? data : EMPTY_ANALYTICS_CHART_DATA;

	return (
		<div className="relative h-full">
			<ChartContainer
				config={config}
				className={cn(
					"aspect-auto h-full w-full",
					!hasData && "pointer-events-none select-none blur-[3px] opacity-60",
					className,
				)}>
				<ComposedChart data={displayedData}>
					<defs>
						<linearGradient id={fillChatsId} x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--chart-1)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--chart-1)"
								stopOpacity={0.1}
							/>
						</linearGradient>
						<linearGradient id={fillVisitorsId} x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--chart-4)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--chart-4)"
								stopOpacity={0.1}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={32}
						tickFormatter={formatDateLabel}
					/>
					<YAxis tickLine={false} axisLine={false} />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								labelFormatter={(value) =>
									formatDateLabel(String(value))
								}
								indicator="dot"
							/>
						}
					/>
					{showVisitors && (
						<Area
							dataKey="visitors"
							type="natural"
							fill={`url(#${fillVisitorsId})`}
							stroke="var(--chart-4)"
							fillOpacity={0.3}
						/>
					)}
					{showChats && (
						<Bar
							dataKey="chats"
							fill="var(--chart-1)"
							radius={[8, 8, 0, 0]}
							barSize={24}
							fillOpacity={0.8}
						/>
					)}
				</ComposedChart>
			</ChartContainer>
			{!hasData && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
						{emptyText}
					</div>
				</div>
			)}
		</div>
	);
}
