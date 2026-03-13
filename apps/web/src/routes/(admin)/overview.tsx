import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { SourcesOverview } from "@/components/analytics/sources-overview";
import { MostRecentConversations } from "@/components/most-recent-conversations";
import { Metrics } from "@/components/metrics";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/overview")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="relative p-4 md:p-6 w-full space-y-6 overflow-x-hidden">
			<Metrics
				sourcesCount={12}
				conversationsCount={34}
				voteCounts={{ upvotes: 56, downvotes: 7 }}
				meter={{ balance: 89 }}
				visitorData={[]}
			/>
			<div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
				<div className="w-full lg:w-[60%] flex">
					<AnalyticsOverview />
				</div>
				<div className="w-full lg:w-[40%] flex">
					<SourcesOverview />
				</div>
			</div>
			<div className="w-full min-w-0">
				<MostRecentConversations />
				{/* <TestTable /> */}
			</div>
		</div>
	);
}
