import { SignupForm } from "@/components/auth/signup-form";
import { TileBackdrop } from "@/components/tile-backdrop";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const registerSearchSchema = z.object({
	invitationId: z.string().optional(),
});

export const Route = createFileRoute("/register")({
	validateSearch: registerSearchSchema,
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<div className="grid min-h-svh lg:grid-cols-2">
				<div className="flex flex-col gap-4 p-6 md:p-10">
					<div className="flex flex-1 items-center justify-center">
						<div className="w-full max-w-sm">
							<SignupForm />
						</div>
					</div>
				</div>
				<div className="relative hidden bg-muted lg:block">
					<TileBackdrop variant="mesh" className="dark:brightness-[0.35]" />
				</div>
			</div>
		</>
	);
}
