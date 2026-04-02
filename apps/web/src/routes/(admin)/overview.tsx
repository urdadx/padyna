import { AnalyticsOverview } from "@/components/overview/analytics-overview";
import { SourcesOverview } from "@/components/analytics/sources-overview";
import { MostRecentConversations } from "@/components/overview/most-recent-conversations";
import { Metrics } from "@/components/overview/metrics";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/(admin)/overview")({
	component: RouteComponent,
});

function RouteComponent() {
	const [
		{ data: metricsData },
		{ data: customerState },
		{ data: recentConversations },
		{ data: sourcesData },
		{ data: overviewQuery },
		{ data: chartQuery },
	] = useSuspenseQueries({
		queries: [
			trpc.metrics.getOverview.queryOptions(),
			trpc.subscription.getCustomerState.queryOptions(),
			trpc.conversations.getRecent.queryOptions({ limit: 5 }),
			trpc.datasource.getMostReferenced.queryOptions({
				timeRange: "24h",
				limit: 10,
			}),
			trpc.analytics.getOverview.queryOptions({
				timeRange: "7d",
			}),
			trpc.analytics.getChartData.queryOptions({
				timeRange: "7d",
			}),
		],
	});

	const messageMeter = customerState?.activeMeters?.find(
		(meter) => (meter?.creditedUnits ?? 0) > 0,
	);
	const messageCreditsBalance = messageMeter?.balance ?? 0;

	return (
		<div className="relative p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
			<Metrics
				sourcesCount={metricsData.sourcesCount}
				conversationsCount={metricsData.conversationsCount}
				voteCounts={{
					upvotes: metricsData.upvotes,
					downvotes: metricsData.downvotes,
				}}
				meter={{ balance: messageCreditsBalance }}
				uniqueVisitors={metricsData.uniqueVisitors}
			/>
			<div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
				<div className="w-full lg:w-[60%] flex">
					<AnalyticsOverview
						overviewQuery={{
							data: overviewQuery,
						}}
						chartQuery={{
							data: chartQuery,
						}}
					/>
				</div>
				<div className="w-full lg:w-[40%] flex">
					<SourcesOverview sourcesData={sourcesData} />
				</div>
			</div>
			<div className="w-full min-w-0">
				<MostRecentConversations conversations={recentConversations ?? []} />
			</div>
		</div>
	);
}
