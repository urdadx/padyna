import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig } from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import NumberFlow from "@number-flow/react";
import { Checkbox } from "../ui/checkbox";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { AnalyticsSkeleton } from "./analytics-skeleton";
import { AnalyticsChart } from "./analytics-chart";
import { useOverviewStream } from "./use-overview-stream";

const TIME_RANGE_ITEMS = [
	{ label: "Last 24 hours", value: "24h" },
	{ label: "Last 7 days", value: "7d" },
	{ label: "Last 30 days", value: "30d" },
	{ label: "Last 3 months", value: "90d" },
] as const;

type TimeRange = (typeof TIME_RANGE_ITEMS)[number]["value"];

const formatDuration = (seconds: number) => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}m ${secs}s`;
};

const chartConfig = {
	visitors: {
		label: "Visitors",
		color: "var(--chart-4)",
	},
	chats: {
		label: "Chats",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function AgentAnalytics() {
	const [showChats, setShowChats] = React.useState(true);
	const [showVisitors, setShowVisitors] = React.useState(true);

	const navigate = useNavigate({ from: "/analytics" });
	const { timeRange } = useSearch({ from: "/(admin)/analytics" });
	const selectedTimeRange: TimeRange = (timeRange as TimeRange) || "24h";

	const chartQuery = useQuery(
		trpc.analytics.getChartData.queryOptions({ timeRange: selectedTimeRange }),
	);

	const streamData = useOverviewStream({ timeRange: selectedTimeRange });

	const chartData = chartQuery.data ?? [];
	const isPending = chartQuery.isPending;
	const overview = streamData.data ?? undefined;
	const hasData =
		(overview?.totalVisits ?? 0) > 0 ||
		(overview?.totalChats ?? 0) > 0 ||
		chartData.length > 0;

	if (isPending && !streamData.data) {
		return <AnalyticsSkeleton />;
	}

	return (
		<div className="mt-4 flex flex-col space-y-4 w-full">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Analytics</h1>
				<Select
					items={TIME_RANGE_ITEMS}
					value={selectedTimeRange}
					onValueChange={(value) => {
						if (value !== null) {
							navigate({
								search: { timeRange: value as TimeRange },
							});
						}
					}}>
					<SelectTrigger
						className="w-fit sm:w-62.5 rounded-lg sm:ml-auto sm:flex"
						aria-label="Select a value">
						<SelectValue placeholder="Last 3 months" />
					</SelectTrigger>
					<SelectContent className="rounded-xl">
						{TIME_RANGE_ITEMS.map((item) => (
							<SelectItem
								key={item.value}
								value={item.value}
								className="rounded-lg">
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="px-1 py-5 w-full rounded-xl border bg-white">
				<CardHeader className="flex flex-row flex-wrap justify-between gap-4">
					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 rounded-full bg-yellow-500" />
								<span>Total visits</span>
							</div>
							<Checkbox
								checked={showVisitors}
								onCheckedChange={(checked) =>
									setShowVisitors(checked === true)
								}
							/>
						</CardTitle>
						<CardDescription className="text-xl md:text-2xl font-semibold text-black">
							<NumberFlow value={overview?.totalVisits ?? 0} />
						</CardDescription>
					</div>

					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 rounded-full bg-primary" />
								<span>Chats started</span>
							</div>
							<Checkbox
								checked={showChats}
								onCheckedChange={(checked) =>
									setShowChats(checked === true)
								}
							/>
						</CardTitle>
						<CardDescription className="text-xl md:text-2xl font-semibold text-black">
							<NumberFlow value={overview?.totalChats ?? 0} />
						</CardDescription>
					</div>

					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 rounded-full bg-gray-500" />
								<span>Bounce rate</span>
							</div>
						</CardTitle>
						<CardDescription className="text-xl md:text-2xl font-semibold text-black">
							{overview && overview.totalVisits > 0
								? `${Math.round(
										((overview.totalVisits -
											overview.totalChats) /
											overview.totalVisits) *
											100,
									)}%`
								: "0%"}
						</CardDescription>
					</div>

					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 rounded-full bg-orange-500" />
								<span>Avg. session time</span>
							</div>
						</CardTitle>
						<CardDescription className="text-xl md:text-2xl font-semibold text-black">
							{formatDuration(overview?.averageSessionTime ?? 0)}
						</CardDescription>
					</div>

					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 animate-pulse rounded-full bg-green-500" />
								<span>Live users</span>
							</div>
						</CardTitle>
						<CardDescription className="text-xl md:text-2xl font-semibold text-black">
							<NumberFlow value={overview?.activeVisitors ?? 0} />
						</CardDescription>
					</div>
				</CardHeader>

				<CardContent className="pt-4 sm:pt-6">
					<AnalyticsChart
						config={chartConfig}
						data={chartData}
						hasData={hasData}
						className="h-75"
						showVisitors={showVisitors}
						showChats={showChats}
					/>
				</CardContent>
			</div>
		</div>
	);
}
