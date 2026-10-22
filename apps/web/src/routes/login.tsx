import LoginForm from "@/components/auth/login-form";
import { TileBackdrop } from "@/components/tile-backdrop";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const loginSearchSchema = z.object({
	invitationId: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	component: RouteComponent,
	beforeLoad: async ({ context, search }) => {
		const session = await context.queryClient.fetchQuery(
			context.trpc.auth.getSession.queryOptions(),
		);

		if (session) {
			throw redirect({ to: "/playground", search });
		}
	},
});

async function RouteComponent() {
	return (
		<>
			<div className="grid min-h-svh lg:grid-cols-2">
				<div className="flex flex-col gap-4 p-6 md:p-10">
					<div className="flex flex-1 items-center justify-center">
						<div className="w-full max-w-sm">
							<LoginForm />
						</div>
					</div>
				</div>
				<div className="relative hidden bg-muted lg:block">
					<TileBackdrop variant="equalizer" className="dark:brightness-[0.35]" />
				</div>
			</div>
		</>
	);
}
