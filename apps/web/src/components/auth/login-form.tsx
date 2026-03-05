import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "../ui/field";
import { GoogleSVG } from "../google-svg";
import { cn } from "@/lib/utils";
import { MotionButton } from "../ui/motion-button";

export default function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
	return (
		<form className={cn("flex flex-col gap-4", className)} {...props}>
			<FieldGroup className="">
				<div className="flex flex-col items-center gap-1 text-center">
					<h1 className="text-3xl font-semibold">Sign in to your account</h1>
					<p className="text-sm text-balance text-muted-foreground">
						Fill in the form below to sign in to your account
					</p>
				</div>

				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input id="email" type="email" placeholder="m@example.com" required />
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
					<MotionButton title="Sign in" />
				</Field>
				<FieldSeparator>Or continue with</FieldSeparator>
				<Field>
					<Button variant="outline" type="button">
						<GoogleSVG />
						Sign in with Google
					</Button>
					<FieldDescription className="px-6 text-center">
						Don't have an account?{" "}
						<Link to="/register">Create an account</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
