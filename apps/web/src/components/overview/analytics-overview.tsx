import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import NumberFlow from "@number-flow/react";
import { trpc } from "@/utils/trpc";
import { ChartLinear } from "@/assets/icons/chart-icon";

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
  const overviewQuery = useSuspenseQuery(
    trpc.analytics.getOverview.queryOptions({ timeRange: "7d" }),
  );

  const chartQuery = useSuspenseQuery(
    trpc.analytics.getChartData.queryOptions({ timeRange: "7d" }),
  );

  const overview = overviewQuery.data;
  const chartData = chartQuery.data ?? [];
  const hasData =
    (overview?.totalVisits ?? 0) > 0 || (overview?.totalChats ?? 0) > 0 || chartData.length > 0;

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
          <span className="text-xs text-muted-foreground text-right">{dateRangeText}</span>
          <h2 className="hidden sm:flex text-xl font-medium">Last 7 days</h2>
        </div>
      </CardHeader>

      <CardContent className=" pt-4 sm:pt-6 flex-1 min-h-0">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="relative inline-block">
              <div
                className="bg-gray-50 max-w-2xl mx-auto flex items-center mb-2 size-14 shrink-0 justify-center rounded-full border"
                aria-hidden="true"
              >
                <ChartLinear className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground border-2 border-background">
                0
              </span>
            </div>
            <p className=" font-display text-lg font-semibold">No data available yet</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="fillChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0.1} />
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
                      return new Date(value).toLocaleDateString("en-US", {
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
        )}
      </CardContent>
    </div>
  );
}
