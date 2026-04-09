import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import api from "@/lib/api";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/utils/trpc";

import { ActionFormShell } from "./action-form-shell";

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  parentName: string | null;
  position: number;
};

type DiscordChannelsResponse = {
  channels: DiscordChannel[];
};

const audienceItems = [
  { label: "Don't mention anyone", value: "none" },
  { label: "Notify only active members", value: "here" },
  { label: "Notify everyone in the server", value: "everyone" },
] as const;

type CreateDiscordActionResponse = {
  action: {
    id: string;
  };
};

export function DiscordActionForm() {
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
    queryKey: ["discord", "channels"],
    refetchOnMount: true,
    queryFn: async () => {
      const response = await api.get<DiscordChannelsResponse>("/api/integrations/discord/channels");
      return response.data;
    },
  });

  const channels = data?.channels ?? [];
  const channelError = (error as AxiosError<{ message: string }>)?.response?.data?.message;
  const selectedChannel = channels.find((channel) => channel.id === channelId) ?? null;
  const channelItems = channels.map((channel) => ({
    label: channel.parentName ? `${channel.parentName} / #${channel.name}` : `#${channel.name}`,
    value: channel.id,
  }));

  const createActionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<CreateDiscordActionResponse>("/api/actions/discord", {
        name: name.trim(),
        description: description.trim(),
        enabled,
        config: {
          channelId: selectedChannel!.id,
          channelName: selectedChannel!.name,
          parentName: selectedChannel!.parentName,
          audience: selectedAudience,
        },
      });

      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Discord action created");
      navigate({ to: "/actions" });
    },
    onError: (mutationError: any) => {
      toast.error(mutationError.response?.data?.message || "Failed to create Discord action");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Action name is required");
      return;
    }

    if (!selectedChannel) {
      toast.error("Select a Discord channel");
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
      title="Send Discord messages"
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
        <Label htmlFor="discord-channel">Select channel</Label>
        {channelError ? (
          <small className="text-red-500">{channelError}</small>
        ) : (
          <small className="text-muted-foreground">
            Choose a text channel from your connected Discord server.
          </small>
        )}
        <Select
          items={channelItems}
          value={channelId}
          onValueChange={(value) => setChannelId(value ?? "")}
          disabled={isLoadingChannels || channels.length === 0}
        >
          <SelectTrigger className="w-full" id="discord-channel">
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
          <Label htmlFor="discord-audience">Audience</Label>
          <small className="text-muted-foreground">
            Choose who should be notified when this action sends a Discord message.
          </small>
        </div>
        <Select
          items={audienceItems as unknown as { label: string; value: string }[]}
          value={selectedAudience}
          onValueChange={(value) =>
            setSelectedAudience(
              (value as (typeof audienceItems)[number]["value"]) ?? audienceItems[0].value,
            )
          }
        >
          <SelectTrigger className="w-full" id="discord-audience">
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
