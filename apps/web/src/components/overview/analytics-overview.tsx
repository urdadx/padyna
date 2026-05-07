import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig } from "@/components/ui/chart";
import NumberFlow from "@number-flow/react";
import { AnalyticsChart } from "../analytics/analytics-chart";

interface AnalyticsOverviewProps {
	overviewQuery?: {
		data?: {
			totalVisits?: number;
			totalChats?: number;
		};
	};
	chartQuery?: {
		data?: Array<{
			date: string;
			visitors: number;
			chats: number;
		}>;
	};
}

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

export function AnalyticsOverview({ overviewQuery, chartQuery }: AnalyticsOverviewProps) {
	const overview = overviewQuery?.data;
	const chartData = chartQuery?.data ?? [];
	const hasData =
		(overview?.totalVisits ?? 0) > 0 ||
		(overview?.totalChats ?? 0) > 0 ||
		chartData.length > 0;

	const today = new Date();
	const weekAgo = new Date(today);
	weekAgo.setDate(today.getDate() - 7);

	const dateRangeText = `${weekAgo.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})} - ${today.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})}`;

	return (
		<div className="px-1 py-5 w-full h-87.5 rounded-xl border bg-white flex flex-col">
			<CardHeader className=" flex flex-row flex-wrap justify-between items-center shrink-0">
				<div className="flex flex-row flex-wrap justify-start gap-12">
					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 items-center justify-center rounded-full bg-yellow-500" />
								<span>Total visits</span>
							</div>
						</CardTitle>
						<CardDescription className="text-xl md:text-xl font-semibold text-black">
							<NumberFlow value={overview?.totalVisits ?? 0} />
						</CardDescription>
					</div>

					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 items-center justify-center rounded-full bg-purple-500" />
								<span>Chats started</span>
							</div>
						</CardTitle>
						<CardDescription className="text-xl md:text-xl font-semibold text-black">
							<NumberFlow value={overview?.totalChats ?? 0} />
						</CardDescription>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground text-right">
						{dateRangeText}
					</span>
					<h2 className="hidden sm:flex text-xl font-medium">Last 7 days</h2>
				</div>
			</CardHeader>

			<CardContent className=" pt-4 sm:pt-6 flex-1 min-h-0">
				<AnalyticsChart config={chartConfig} data={chartData} hasData={hasData} />
			</CardContent>
		</div>
	);
}
