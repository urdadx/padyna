import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import NumberFlow from "@number-flow/react";

const DUMMY_CHART_DATA = [
	{ date: "2024-03-01", visitors: 450, chats: 120 },
	{ date: "2024-03-02", visitors: 520, chats: 150 },
	{ date: "2024-03-03", visitors: 380, chats: 90 },
	{ date: "2024-03-04", visitors: 610, chats: 210 },
	{ date: "2024-03-05", visitors: 590, chats: 180 },
	{ date: "2024-03-06", visitors: 720, chats: 250 },
	{ date: "2024-03-07", visitors: 810, chats: 310 },
];

const DUMMY_REALTIME = {
	totalVisits: 4082,
	totalChats: 1310,
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

export function AnalyticsOverview() {
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
							<NumberFlow value={DUMMY_REALTIME.totalVisits} />
						</CardDescription>
					</div>

					<div className="flex flex-col gap-1 text-left min-w-24">
						<CardTitle className="flex items-center gap-3 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<div className="inset-0 size-2 items-center justify-center rounded-full bg-purple-500" />
								<span>Total chats</span>
							</div>
						</CardTitle>
						<CardDescription className="text-xl md:text-xl font-semibold text-black">
							<NumberFlow value={DUMMY_REALTIME.totalChats} />
						</CardDescription>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground text-right">
						Mar 21 - Mar 28
					</span>
					<h2 className="hidden sm:flex text-xl font-medium">Last 7 days</h2>
				</div>
			</CardHeader>

			<CardContent className=" pt-4 sm:pt-6 flex-1 min-h-0">
				<ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
					<ComposedChart data={DUMMY_CHART_DATA}>
						<defs>
							<linearGradient
								id="fillChats"
								x1="0"
								y1="0"
								x2="0"
								y2="1">
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
							<linearGradient
								id="fillVisitors"
								x1="0"
								y1="0"
								x2="0"
								y2="1">
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
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<YAxis tickLine={false} axisLine={false} />
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => {
										return new Date(
											value,
										).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
										});
									}}
									indicator="dot"
								/>
							}
						/>

						<Area
							dataKey="visitors"
							type="natural"
							fill="url(#fillVisitors)"
							stroke="var(--chart-4)"
							fillOpacity={0.3}
						/>

						<Bar
							dataKey="chats"
							fill="var(--chart-1)"
							radius={[8, 8, 0, 0]}
							barSize={24}
							fillOpacity={0.8}
						/>
					</ComposedChart>
				</ChartContainer>
			</CardContent>
		</div>
	);
}
