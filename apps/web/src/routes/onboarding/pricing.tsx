import { PricingOptions } from "@/components/pricing-options";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/pricing")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex min-h-screen w-full items-center justify-center p-4">
			<div className="w-full">
				<PricingOptions />
			</div>
		</div>
	);
}
