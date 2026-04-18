import { PadynaLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
	beforeLoad: async ({ context, location }) => {
		const session = await context.queryClient.fetchQuery(
			context.trpc.auth.getSession.queryOptions(),
		);

		if (session) {
			throw redirect({ to: "/playground", search: location.search });
		}
		return redirect({ to: "/login", search: location.search });
	},
});

function HomeComponent() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<div className="grid gap-6">
				<PadynaLogo />
				<Link to="/playground">
					<Button>Go to playground</Button>
				</Link>
			</div>
		</div>
	);
}
