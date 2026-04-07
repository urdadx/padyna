import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import api from "@/lib/api";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

export function DiscordActionForm() {
	const [name, setName] = useState("");
	const [channelId, setChannelId] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(true);

	const {
		data,
		isLoading: isLoadingChannels,
		error,
	} = useQuery({
		queryKey: ["discord", "channels"],
		refetchOnMount: true,
		queryFn: async () => {
			const response = await api.get<DiscordChannelsResponse>(
				"/api/integrations/discord/channels",
			);
			return response.data;
		},
	});

	const channels = data?.channels ?? [];
	const channelError = (error as AxiosError<{ message: string }>)?.response?.data?.message;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	return (
		<ActionFormShell
			title="Send Discord messages"
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
				<Label htmlFor="discord-channel">Select channel</Label>
				{channelError ? (
					<small className="text-red-500">{channelError}</small>
				) : (
					<small className="text-muted-foreground">
						Choose a text channel from your connected Discord server.
					</small>
				)}
				<Select
					value={channelId}
					onValueChange={(value) => setChannelId(value ?? "")}
					disabled={isLoadingChannels || channels.length === 0}>
					<SelectTrigger className="w-full" id="discord-channel">
						<SelectValue
							placeholder={
								isLoadingChannels
									? "Loading channels..."
									: "Select channel"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{channels.map((channel) => (
							<SelectItem key={channel.id} value={channel.id}>
								{channel.parentName
									? `${channel.parentName} / #${channel.name}`
									: `#${channel.name}`}
							</SelectItem>
						))}
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
