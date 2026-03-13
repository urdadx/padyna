import InputWithStartAddon from "../Input-with-start";
import { Button } from "../ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { AvatarStack } from "./avatar-stack";
import { Input } from "../ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@/lib/auth-client";
import { GOOGLE_FAVICON_URL } from "@/constants/domains";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import Spinner from "../ui/spinner";
import { getWebsiteDomain } from "@/lib/utils";
import { z } from "zod";

export const StepOne = ({ onContinue }: { onContinue: () => void }) => {
  const [debouncedWebsiteDomain, setDebouncedWebsiteDomain] = useState("");
  const [isFaviconLoading, setIsFaviconLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      websiteUrl: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const websiteDomain = getWebsiteDomain(value.websiteUrl);
        const slug = `${value.name}_${nanoid(6)}`;
        const logo = websiteDomain ? `${GOOGLE_FAVICON_URL}${websiteDomain}` : undefined;

        await authClient.organization.create({
          name: value.name.trim(),
          slug,
          logo,
        });
        onContinue();
      } catch (error: any) {
        console.error("Error creating organization:", error);
        toast.error("Failed to create organization");
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, "Organization name is required"),
        websiteUrl: z.string(),
      }),
    },
  });

  const websiteFavicon = debouncedWebsiteDomain
    ? `${GOOGLE_FAVICON_URL}${debouncedWebsiteDomain}`
    : undefined;

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="p-6 md:p-12 flex flex-col items-center justify-center h-full max-w-lg mx-auto"
      >
        <FieldGroup>
          <div className="flex flex-col gap-2 text-start">
            <AvatarStack
              className="mb-2"
              websiteFavicon={websiteFavicon}
              isLoading={isFaviconLoading}
            />
            <h1 className="text-3xl font-semibold">First things first</h1>
            <p className=" text-muted-foreground leading-relaxed">
              Let&apos;s create your organization and quickly set up your AI agent.
            </p>
          </div>
          <Field className="mt-4">
            <FieldLabel htmlFor="organization-name">Organization name</FieldLabel>
            <form.Field
              name="name"
              children={(field) => (
                <>
                  <Input
                    id="organization-name"
                    placeholder="Google Inc."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    required
                  />
                  <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                </>
              )}
            />
          </Field>
          <Field>
            <form.Field
              name="websiteUrl"
              validators={{
                onChangeAsyncDebounceMs: 500,
                onChangeAsync: async ({ value }) => {
                  setDebouncedWebsiteDomain(getWebsiteDomain(value));
                  setIsFaviconLoading(false);
                },
              }}
              children={(field) => (
                <>
                  <InputWithStartAddon
                    value={field.state.value}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      field.handleChange(nextValue);
                      setIsFaviconLoading(Boolean(nextValue.trim()));
                    }}
                  />
                  <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                </>
              )}
            />
          </Field>
          <Field>
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full"
                >
                  <Button className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Spinner color="white" size={16} />
                        Creating
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </motion.div>
              )}
            />
          </Field>
        </FieldGroup>
      </form>
    </>
  );
};
