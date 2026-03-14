import { IntegrationCard } from "@/components/integrations/integration-card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/integrations")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="px-4 sm:px-12 py-6 min-h-screen">
			<div className="w-full min-h-screen">
				<div className="w-full max-w-7xl mx-auto space-y-6">
					<h2 className="text-2xl font-semibold ">Integrations</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						<IntegrationCard />
					</div>
				</div>
			</div>
		</div>
	);
}
