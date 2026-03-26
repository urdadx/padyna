import { AnalyticsOverview } from "@/components/overview/analytics-overview";
import { SourcesOverview } from "@/components/analytics/sources-overview";
import { MostRecentConversations } from "@/components/overview/most-recent-conversations";
import { Metrics } from "@/components/overview/metrics";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/(admin)/overview")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: metricsData } = useSuspenseQuery(trpc.metrics.getOverview.queryOptions());
  const { data: recentConversations } = useSuspenseQuery(
    trpc.conversations.getRecent.queryOptions({ limit: 5 }),
  );
  const { data: sourcesData } = useSuspenseQuery(
    trpc.datasource.getMostReferenced.queryOptions({ timeRange: "24h", limit: 10 }),
  );

  return (
    <div className="relative p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <Metrics
        sourcesCount={metricsData.sourcesCount}
        conversationsCount={metricsData.conversationsCount}
        voteCounts={{
          upvotes: metricsData.upvotes,
          downvotes: metricsData.downvotes,
        }}
        meter={{ balance: 89 }}
        uniqueVisitors={metricsData.uniqueVisitors}
      />
      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
        <div className="w-full lg:w-[60%] flex">
          <AnalyticsOverview />
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
