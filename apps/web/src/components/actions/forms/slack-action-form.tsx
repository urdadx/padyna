import { useReducer } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import api from "@/lib/api";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ActionFormShell } from "./action-form-shell";
import { queryClient } from "@/utils/trpc";
import type { ActionFormProps, SlackActionConfig } from "./types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
};

type SlackChannelsResponse = {
  channelId: string | null;
  channels: SlackChannel[];
  teamId: string;
};

const audienceItems = [
  { label: "Notify everyone in the channel", value: "channel" },
  { label: "Notify only active members", value: "here" },
  { label: "Notify everyone in #general", value: "everyone" },
] as const;

type CreateSlackActionResponse = {
  action: {
    id: string;
  };
};

type SlackActionFormState = {
  name: string;
  channelId: string;
  description: string;
  enabled: boolean;
  selectedAudience: (typeof audienceItems)[number]["value"];
};

function slackActionFormReducer(
  state: SlackActionFormState,
  action: Partial<SlackActionFormState>,
) {
  return { ...state, ...action };
}

export function SlackActionForm({
  mode = "create",
  actionId,
  initialAction,
}: ActionFormProps<SlackActionConfig>) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();
  const [formState, updateFormState] = useReducer(slackActionFormReducer, {
    name: initialAction?.name ?? "",
    channelId: initialAction?.config.channelId ?? "",
    description: initialAction?.description ?? "",
    enabled: initialAction?.enabled ?? true,
    selectedAudience: initialAction?.config.audience ?? audienceItems[0].value,
  });
  const { name, channelId, description, enabled, selectedAudience } = formState;

  const {
    data,
    isLoading: isLoadingChannels,
    error,
  } = useQuery({
    queryKey: ["slack", "channels"],
    refetchOnMount: true,
    queryFn: async () => {
      const response = await api.get<SlackChannelsResponse>("/api/integrations/slack/channels");
      return response.data;
    },
  });

  const channels = data?.channels ?? [];
  const channelError = (error as AxiosError<{ message: string }>)?.response?.data?.message;
  const selectedChannel = channels.find((channel) => channel.id === channelId) ?? null;
  const channelItems = channels.map((channel) => ({
    label: channel.isPrivate ? `${channel.name} (Private)` : `#${channel.name}`,
    value: channel.id,
  }));

  const saveActionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        enabled,
        config: {
          channelId: selectedChannel!.id,
          channelName: selectedChannel!.name,
          isPrivate: selectedChannel!.isPrivate,
          audience: selectedAudience,
        },
      };

      const response = isEditMode
        ? await api.patch<CreateSlackActionResponse>(`/api/actions/${actionId}`, payload)
        : await api.post<CreateSlackActionResponse>("/api/actions/slack", payload);

      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
      await queryClient.invalidateQueries({ queryKey: ["actions", actionId] });
      toast.success(isEditMode ? "Slack action updated" : "Slack action created");

      if (!isEditMode) {
        navigate({
          to: "/actions/$actionId/edit",
          params: { actionId: data.action.id },
        });
      }
    },
    onError: (mutationError: any) => {
      toast.error(
        mutationError.response?.data?.message ||
          (isEditMode ? "Failed to update Slack action" : "Failed to create Slack action"),
      );
    },
  });

	const handleSubmit = () => {
		if (!name.trim()) {
			toast.error("Action name is required");
			return;
    }

    if (!selectedChannel) {
      toast.error("Select a Slack channel");
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
      title={isEditMode ? "Edit Slack action" : "Send Slack message"}
      enabled={enabled}
      onEnabledChange={(nextEnabled) => updateFormState({ enabled: nextEnabled })}
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
          onChange={(e) => updateFormState({ name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="slack-channel">Slack channel</Label>
          {channelError ? (
            <small className="text-red-500">{channelError}</small>
          ) : (
            <small className="text-muted-foreground">Choose the Slack channel to notify.</small>
          )}
        </div>
        <Select
          items={channelItems}
          value={channelId}
          onValueChange={(value) => updateFormState({ channelId: value ?? "" })}
          disabled={isLoadingChannels || channels.length === 0}
        >
          <SelectTrigger className="w-full" id="slack-channel">
            <SelectValue
              placeholder={isLoadingChannels ? "Loading channels..." : "Select channel"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Channels</SelectLabel>
              {channelItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="channel"> Audience</Label>
          <small className="text-muted-foreground">
            Choose who should be notified in the Slack channel when this action is triggered.
          </small>
        </div>
        <Select
          items={audienceItems}
          value={selectedAudience}
          onValueChange={(value) =>
            updateFormState({
              selectedAudience:
                (value as (typeof audienceItems)[number]["value"]) ?? audienceItems[0].value,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Notification Audience</SelectLabel>
              {audienceItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="description">When to use</Label>
          <small className="text-muted-foreground">
            Describe when this action should be triggered. The description should provide clear
            guidance on the intended use case for this action.
          </small>
        </div>
        <Textarea
          id="description"
          className="w-full"
          placeholder="Enter a description for when to use this action"
          value={description}
          onChange={(e) => updateFormState({ description: e.target.value })}
        />
      </div>
    </ActionFormShell>
  );
}
