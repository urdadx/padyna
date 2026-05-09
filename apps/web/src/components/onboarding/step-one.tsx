import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import InputWithStartAddon from "../Input-with-start";
import { Button } from "../ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { AvatarStack } from "./avatar-stack";
import { Input } from "../ui/input";
import { motion } from "motion/react";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@/lib/auth-client";
import { GOOGLE_FAVICON_URL } from "@/constants/domains";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import Spinner from "../ui/spinner";
import { getWebsiteDomain } from "@/lib/utils";
import { z } from "zod";
import api from "@/lib/api";
import { queryClient, trpc } from "@/utils/trpc";

interface CrawlResult {
  crawlId: string;
  url: string;
  status: "active" | "completed" | "failed" | "cancelled";
  totalPages: number;
  completedPages: number;
  processed?: {
    crawlId: string;
    datasourceIds: string[];
    status: "success" | "failed";
    totalChunks: number;
    message?: string;
  };
}

export const StepOne = ({ onContinue }: { onContinue: () => void }) => {
  const [debouncedWebsiteDomain, setDebouncedWebsiteDomain] = useState("");
  const [isFaviconLoading, setIsFaviconLoading] = useState(false);
  const crawlStatusRef = useRef<CrawlResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startCrawl = useMutation({
    mutationFn: async (url: string) => {
      const response = await api.post("/api/ingestion/crawl", { url });
      return response.data as CrawlResult;
    },
  });

  const pollCrawlStatus = async (id: string, onComplete: () => void) => {
    const checkStatus = async (): Promise<void> => {
      const response = await api.get(`/api/ingestion/crawl/${id}`);
      const status = response.data as CrawlResult;

      crawlStatusRef.current = status;

      if (status.status === "completed") {
        if (status.processed?.status === "success") {
          queryClient.invalidateQueries({
            queryKey: trpc.datasource.getAll.queryOptions().queryKey,
          });
          onComplete();
        } else {
          toast.error("Failed to process website content.");
          onComplete();
        }
        return;
      }

      if (status.status === "failed" || status.status === "cancelled") {
        toast.error(`Website crawl ${status.status}.`);
        onComplete();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
      await checkStatus();
    };

    await checkStatus();

    if (isMountedRef.current) {
      setIsPolling(false);
      crawlStatusRef.current = null;
    }
  };

  const form = useForm({
    defaultValues: {
      name: "",
      websiteUrl: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const websiteDomain = getWebsiteDomain(value.websiteUrl);
        const slug = `${value.name.toLocaleLowerCase()}_${nanoid(16)}`;
        const logo = websiteDomain ? `${GOOGLE_FAVICON_URL}${websiteDomain}` : undefined;

        const { data: orgData, error } = await authClient.organization.create({
          name: value.name.trim(),
          slug,
          logo,
        });

        if (error || !orgData) {
          toast.warning("Failed to create your team. Please try again.");
          return;
        }

        await authClient.organization.setActive({
          organizationId: orgData.id,
          organizationSlug: orgData.slug,
        });

        await queryClient.invalidateQueries(trpc.auth.getSession.queryOptions());

        if (websiteDomain) {
          const rawUrl = value.websiteUrl.trim();
          const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

          setIsPolling(true);
          const loadingToastId = toast.loading("Fetching links for training...");
          try {
            const crawlData = await startCrawl.mutateAsync(fullUrl);
            await pollCrawlStatus(crawlData.crawlId, onContinue);
            toast.dismiss(loadingToastId);
          } catch (error: any) {
            console.error("Error starting crawl:", error);
            toast.dismiss(loadingToastId);
            toast.error("Failed to fetch website links.");
            onContinue();
          }
        } else {
          onContinue();
        }
      } catch (error: any) {
        console.error("Error creating organization:", error);
        toast.warning("Failed to create your team. Please try again.");
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
				action={() => form.handleSubmit()}
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
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={isSubmitting || isPolling || startCrawl.isPending}
                  >
                    {isPolling ? (
                      <>
                        <Spinner className="text-white" size={16} />
                        Fetching links for training
                      </>
                    ) : isSubmitting || startCrawl.isPending ? (
                      <>
                        <Spinner className="text-white" size={16} />
                        Creating your team...
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
