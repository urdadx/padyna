import { AgentAnalytics } from "@/components/analytics/agent-analytics";
import { TopCountries } from "@/components/analytics/top-countries";
import { TopSources } from "@/components/analytics/top-sources";
import { TopPlatforms } from "@/components/analytics/top-platforms-referrers";
import { TopActions } from "@/components/analytics/top-actions";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const timeRangeSchema = z.object({
	timeRange: z.enum(["24h", "7d", "30d", "90d"]).optional().default("24h"),
});

export const Route = createFileRoute("/(admin)/analytics")({
	component: RouteComponent,
	validateSearch: timeRangeSchema,
});

function RouteComponent() {
	return (
		<div className="relative w-full overflow-x-hidden">
			<div className="w-full bg-background p-4 px-4 sm:px-6 lg:px-8 py-6">
				<div className="max-w-7xl mx-auto ">
					<AgentAnalytics />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-6">
						<TopCountries />
						<TopSources />
						<TopPlatforms />
						<TopActions />
					</div>
				</div>
			</div>
		</div>
	);
}
