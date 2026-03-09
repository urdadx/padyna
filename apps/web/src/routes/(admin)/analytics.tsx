import { AgentAnalytics } from "@/components/analytics/agent-analytics";
import { CountryAnalytics } from "@/components/analytics/country-analytics";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/analytics")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex w-full">
			<div className="w-full bg-background p-4 px-4 sm:px-6 lg:px-8 py-6">
				<div className="max-w-7xl mx-auto ">
					<AgentAnalytics />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-6">
						<CountryAnalytics visitorData={[]} />
					</div>
				</div>
			</div>
		</div>
	);
}
