import { PricingOptions } from "@/components/pricing-options";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/pricing")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex min-h-svh w-full items-start justify-center px-4 py-6 md:min-h-screen md:items-center md:p-4">
			<div className="w-full">
				<PricingOptions />
			</div>
		</div>
	);
}
