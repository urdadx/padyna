import { useState, type FormEvent } from "react";
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

export function SlackActionForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState<(typeof audienceItems)[number]["value"]>(
    audienceItems[0].value,
  );

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

  const createActionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<CreateSlackActionResponse>("/api/actions/slack", {
        name: name.trim(),
        description: description.trim(),
        enabled,
        config: {
          channelId: selectedChannel!.id,
          channelName: selectedChannel!.name,
          isPrivate: selectedChannel!.isPrivate,
          audience: selectedAudience,
        },
      });

      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Slack action created");
      navigate({ to: "/actions" });
    },
    onError: (mutationError: any) => {
      toast.error(mutationError.response?.data?.message || "Failed to create Slack action");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    createActionMutation.mutate();
  };

  return (
    <ActionFormShell
      title="Send Slack message"
      enabled={enabled}
      onEnabledChange={setEnabled}
      onSubmit={handleSubmit}
      isSubmitting={createActionMutation.isPending}
      submitLabel="Save action"
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
          onValueChange={(value) => setChannelId(value ?? "")}
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
            setSelectedAudience(
              (value as (typeof audienceItems)[number]["value"]) ?? audienceItems[0].value,
            )
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
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </ActionFormShell>
  );
}
