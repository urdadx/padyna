import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AlertCircleIcon } from "lucide-react";

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

import { ActionFormShell } from "./action-form-shell";

type CalendlyEventType = {
	uri: string;
	name: string;
	active: boolean;
	duration?: number;
};

type CalendlyEventTypesResponse = {
	eventTypes: CalendlyEventType[];
};

export function CalendlyActionForm() {
	const [name, setName] = useState("");
	const [eventType, setEventType] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(true);

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

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	return (
		<ActionFormShell
			title="Book Calendly slots"
			enabled={enabled}
			onEnabledChange={setEnabled}
			onSubmit={handleSubmit}>
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
					disabled={isLoadingEventTypes || eventTypeItems.length === 0}>
					<SelectTrigger className="w-full">
						<SelectValue
							placeholder={
								isLoadingEventTypes ? "Loading event types..." : "Select event type"
							}
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
						Describe when this action should be triggered. The description
						should provide clear guidance on the intended use case for this
						action.
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
