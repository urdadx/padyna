import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GoogleSVG } from "../google-svg";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { motion } from "motion/react";
import Spinner from "../ui/spinner";

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/onboarding",
						});
						toast.success("Account created");
					},
					onError: (error) => {
						toast.warning(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className={cn("flex flex-col gap-4", className)}
			{...props}>
			<FieldGroup className="">
				<div className="flex flex-col items-center gap-1 text-center">
					<h1 className="text-3xl font-semibold">Create your account</h1>
					<p className="text-sm text-balance text-muted-foreground">
						Fill in the form below to create your account
					</p>
				</div>
				<form.Field name="name">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Username</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								type="text"
								placeholder="Jack Maaye"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								required
							/>
							<FieldError>
								{field.state.meta.errors.join(", ")}
							</FieldError>
						</Field>
					)}
				</form.Field>

				<form.Field name="email">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Email</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								type="email"
								placeholder="malika@example.com"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								required
							/>
							<FieldError>
								{field.state.meta.errors.join(", ")}
							</FieldError>
						</Field>
					)}
				</form.Field>

				<form.Field name="password">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Password</FieldLabel>
							<Input
								placeholder="********"
								id={field.name}
								name={field.name}
								type="password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								required
							/>
							<FieldError>
								{field.state.meta.errors.join(", ")}
							</FieldError>
						</Field>
					)}
				</form.Field>

				<Field>
					<form.Subscribe>
						{(state) => (
							<motion.div
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="relative w-full">
								<Button className="w-full" type="submit">
									{state.isSubmitting ? (
										<Spinner className="text-white" />
									) : (
										"Create my account"
									)}
								</Button>
							</motion.div>
						)}
					</form.Subscribe>
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
