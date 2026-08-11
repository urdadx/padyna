import { SignupForm } from "@/components/auth/signup-form";
import { DitherImage } from "@/components/dither-kit";
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
					<DitherImage
						src="https://assets.padyna.com/assets/windmill.webp"
						alt="Windmill in a field"
						loading="lazy"
						className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
					/>
				</div>
			</div>
		</>
	);
}
