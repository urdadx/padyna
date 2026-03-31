import { useNavigate, Link, useSearch } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "../ui/field";
import { GoogleSVG } from "../google-svg";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "motion/react";
import Spinner from "../ui/spinner";
import { queryClient, trpc } from "@/utils/trpc";
import { env } from "@padyna/env/web";

export default function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();

  const { invitationId } = useSearch({
    from: "/login",
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            if (invitationId) {
              try {
                const response = await fetch(
                  `${env.VITE_SERVER_URL}/api/accept-invitation/${invitationId}`,
                  {
                    method: "POST",
                    credentials: "include",
                  },
                );
                if (response.ok) {
                  await queryClient.invalidateQueries(trpc.auth.getSession.queryOptions());
                  window.location.href = `${env.VITE_FRONTEND_ORIGIN}/playground?invitation=accepted`;
                } else {
                  const data = await response.json();
                  if (data.code === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION") {
                    toast.error(
                      "The invitation was sent to a different email address. Please use the invited email to sign in.",
                    );
                    return;
                  }
                  toast.error(data.error || "Failed to accept invitation");
                  navigate({ to: "/playground" });
                }
              } catch {
                navigate({ to: "/playground" });
              }
            } else {
              navigate({ to: "/playground" });
              toast.success("Signed In");
            }
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
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
      {...props}
    >
      <FieldGroup className="">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-3xl font-semibold">Sign in to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to sign in to your account
          </p>
        </div>

        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                placeholder="brett@example.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
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
              <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
            </Field>
          )}
        </form.Field>

        <Field>
          <form.Subscribe>
            {(state) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full"
              >
                <Button className="w-full" type="submit">
                  {state.isSubmitting ? <Spinner className="text-white" /> : "Sign in"}
                </Button>
              </motion.div>
            )}
          </form.Subscribe>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant="outline" type="button">
            <GoogleSVG />
            Sign in with Google
          </Button>
          <FieldDescription className="px-6 text-center">
            Don't have an account?{" "}
            <Link
              to="/register"
              search={{ invitationId }}
              className="text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
