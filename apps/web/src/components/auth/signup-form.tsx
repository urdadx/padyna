import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GoogleSVG } from "../google-svg";
import { Link } from "@tanstack/react-router";
import { MotionButton } from "../ui/motion-button";

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
	return (
		<form className={cn("flex flex-col gap-4", className)} {...props}>
			<FieldGroup className="">
				<div className="flex flex-col items-center gap-1 text-center">
					<h1 className="text-3xl font-semibold">Create your account</h1>
					<p className="text-sm text-balance text-muted-foreground">
						Fill in the form below to create your account
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="name">Username</FieldLabel>
					<Input id="name" type="text" placeholder="Jack Maaye" required />
				</Field>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="malika@example.com"
						required
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						placeholder="********"
						id="password"
						type="password"
						required
					/>
				</Field>

				<Field>
					<MotionButton title="Create my account" />
				</Field>
				<FieldSeparator>Or continue with</FieldSeparator>
				<Field>
					<Button variant="outline" type="button">
						<GoogleSVG />
						Sign up with Google
					</Button>
					<FieldDescription className="px-6 text-center">
						Already have an account? <Link to="/login">Sign in</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
