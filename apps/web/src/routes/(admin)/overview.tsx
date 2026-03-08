import { Metrics } from "@/components/metrics";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/overview")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="relative p-6 w-full md:max-w-6xl mx-auto space-y-10">
			<Metrics
				sourcesCount={12}
				conversationsCount={34}
				voteCounts={{ upvotes: 56, downvotes: 7 }}
				meter={{ balance: 89 }}
				visitorData={[]}
			/>
		</div>
	);
}
