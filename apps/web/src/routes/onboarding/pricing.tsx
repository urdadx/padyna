import { PricingOptions } from "@/components/pricing-options";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/pricing")({
	component: RouteComponent,
});

function RouteComponent() {
	return <PricingOptions />;
}
