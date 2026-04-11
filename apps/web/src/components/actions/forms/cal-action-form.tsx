import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/utils/trpc";

import { ActionFormShell } from "./action-form-shell";
import type { ActionFormProps, CalActionConfig } from "./types";

type CreateCalActionResponse = {
  action: {
    id: string;
  };
};

export function CalActionForm({ mode = "create", actionId, initialAction }: ActionFormProps<CalActionConfig>) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();

  const [name, setName] = useState(initialAction?.name ?? "");
  const [calUrl, setCalUrl] = useState(initialAction?.config.calUrl ?? "");
  const [description, setDescription] = useState(initialAction?.description ?? "");
  const [enabled, setEnabled] = useState(initialAction?.enabled ?? true);

  const saveActionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        enabled,
        config: {
          calUrl: calUrl.trim(),
        },
      };

      const response = isEditMode
        ? await api.patch<CreateCalActionResponse>(`/api/actions/${actionId}`, payload)
        : await api.post<CreateCalActionResponse>("/api/actions/cal", payload);

      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
      await queryClient.invalidateQueries({ queryKey: ["actions", actionId] });
      toast.success(isEditMode ? "Cal action updated" : "Cal action created");

      if (!isEditMode) {
        navigate({
          to: "/actions/$actionId/edit",
          params: { actionId: data.action.id },
        });
      }
    },
    onError: (mutationError: unknown) => {
      toast.error(
        isEditMode ? "Failed to update Cal action" : "Failed to create Cal action",
      );
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Action name is required");
      return;
    }

    if (!calUrl.trim()) {
      toast.error("Cal.com URL is required");
      return;
    }

    try {
      new URL(calUrl);
    } catch {
      toast.error("Invalid Cal.com URL (e.g., https://cal.com/username/15min)");
      return;
    }

    if (!description.trim()) {
      toast.error("When to use is required");
      return;
    }

    saveActionMutation.mutate();
  };

  return (
    <ActionFormShell
      title={isEditMode ? "Edit Cal action" : "Book Cal slots"}
      enabled={enabled}
      onEnabledChange={setEnabled}
      onSubmit={handleSubmit}
      isSubmitting={saveActionMutation.isPending}
      submitLabel={isEditMode ? "Save changes" : "Save action"}
    >
      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Action name</Label>
          <small className="text-muted-foreground">
            Give your action a name that clearly describes its purpose.
          </small>
        </div>
        <Input
          id="name"
          placeholder="Enter action name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="calUrl">Cal.com URL</Label>
          <small className="text-muted-foreground">
            Your Cal.com event URL (e.g., https://cal.com/username/15min)
          </small>
        </div>
        <Input
          id="calUrl"
          placeholder="https://cal.com/username/15min"
          value={calUrl}
          onChange={(e) => setCalUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="description">When to use</Label>
          <small className="text-muted-foreground">
            Describe when this action should be triggered. The description should provide clear guidance on the
            intended use case for this action.
          </small>
        </div>
        <Textarea
          id="description"
          className="w-full"
          placeholder="Enter a description for when to use this action"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </ActionFormShell>
  );
}
