import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircleIcon } from "lucide-react";
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
import type { ActionFormProps, CalendlyActionConfig } from "./types";

type CalendlyEventType = {
  uri: string;
  name: string;
  active: boolean;
  duration?: number;
  scheduling_url?: string;
};

type CalendlyEventTypesResponse = {
  eventTypes: CalendlyEventType[];
};

type CreateCalendlyActionResponse = {
  action: {
    id: string;
  };
};

export function CalendlyActionForm({
  mode = "create",
  actionId,
  initialAction,
}: ActionFormProps<CalendlyActionConfig>) {
  const isEditMode = mode === "edit";
  const navigate = useNavigate();
  const [name, setName] = useState(initialAction?.name ?? "");
  const [eventType, setEventType] = useState(initialAction?.config.eventTypeUri ?? "");
  const [description, setDescription] = useState(initialAction?.description ?? "");
  const [enabled, setEnabled] = useState(initialAction?.enabled ?? true);

  const {
    data,
    isLoading: isLoadingEventTypes,
    error,
  } = useQuery({
    queryKey: ["calendly", "event-types"],
    refetchOnMount: true,
    queryFn: async () => {
      const response = await api.get<CalendlyEventTypesResponse>(
        "/api/integrations/calendly/event-types",
      );
      return response.data;
    },
  });

  const eventTypes = data?.eventTypes ?? [];
  const eventTypeItems = eventTypes.map((item) => ({
    label: item.duration ? `${item.name} (${item.duration} min)` : item.name,
    value: item.uri,
  }));
  const eventTypeMessage =
    (error as AxiosError<{ message: string }>)?.response?.data?.message ?? null;
  const selectedEventType = eventTypes.find((item) => item.uri === eventType) ?? null;

  const saveActionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        enabled,
        config: {
          eventTypeUri: selectedEventType!.uri,
          eventTypeName: selectedEventType!.name,
          schedulingUrl: selectedEventType!.scheduling_url ?? null,
          duration: selectedEventType!.duration ?? null,
        },
      };

      const response = isEditMode
        ? await api.patch<CreateCalendlyActionResponse>(`/api/actions/${actionId}`, payload)
        : await api.post<CreateCalendlyActionResponse>("/api/actions/calendly", payload);

      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
      await queryClient.invalidateQueries({ queryKey: ["actions", actionId] });
      toast.success(isEditMode ? "Calendly action updated" : "Calendly action created");

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
          (isEditMode ? "Failed to update Calendly action" : "Failed to create Calendly action"),
      );
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Action name is required");
      return;
    }

    if (!selectedEventType) {
      toast.error("Select a Calendly event type");
      return;
    }

    if (!selectedEventType.scheduling_url) {
      toast.error("Selected Calendly event type does not have a scheduling URL");
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
      title={isEditMode ? "Edit Calendly action" : "Book Calendly slots"}
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
        <Label htmlFor="eventType">
          Select your preferred event <AlertCircleIcon size={14} />
        </Label>
        {eventTypeMessage ? (
          <small className="text-red-500">{eventTypeMessage}</small>
        ) : (
          <small className="text-muted-foreground">
            Choose an event type from your connected Calendly account.
          </small>
        )}
        <Select
          items={eventTypeItems}
          value={eventType}
          onValueChange={(value) => setEventType(value ?? "")}
          disabled={isLoadingEventTypes || eventTypeItems.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={isLoadingEventTypes ? "Loading event types..." : "Select event type"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Event types</SelectLabel>
              {eventTypeItems.map((item) => (
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
