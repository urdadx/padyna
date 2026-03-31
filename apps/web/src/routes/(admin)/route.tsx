import { AppSidebar } from "@/components/app-sidebar";
import { GlobalLoader } from "@/components/global-loader";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/(admin)")({
	component: RouteComponent,
	beforeLoad: ({ context, location }) => {
		const { session } = context;

		if (!session) {
			throw redirect({ to: "/login", search: location.search });
		}
		if (!session.session.activeOrganization) {
			throw redirect({ to: "/onboarding" });
		}
		if (!session.user.isSubscribed) {
			throw redirect({ to: "/onboarding/pricing" });
		}
	},
});

function RouteComponent() {
	return (
		<>
			<Suspense fallback={<GlobalLoader />}>
				<AppSidebar />
			</Suspense>
		</>
	);
}
