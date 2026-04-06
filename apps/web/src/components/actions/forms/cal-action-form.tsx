import { useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ActionFormShell } from "./action-form-shell";

export function CalActionForm() {
	const [name, setName] = useState("");
	const [eventUrl, setEventUrl] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(true);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	return (
		<ActionFormShell
			title="Book Cal.com slots"
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
				<div className="flex flex-col gap-1">
					<Label htmlFor="eventUrl">Cal event URL</Label>
					<small className="text-muted-foreground">
						Example: https://cal.com/urdadx/30mins
					</small>
				</div>
				<Input
					id="eventUrl"
					placeholder="Enter your Cal.com event URL"
					value={eventUrl}
					onChange={(e) => setEventUrl(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<div className="flex flex-col gap-1">
					<Label htmlFor="description">When to use</Label>
					<small className="text-muted-foreground">
						Describe when this action should be triggered. The description
						should provide clear guidance on the intended use case for this
						action
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
