import { useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ActionFormShell } from "./action-form-shell";
import {
	SelectTrigger,
	Select,
	SelectItem,
	SelectContent,
	SelectValue,
} from "@/components/ui/select";

export function SlackActionForm() {
	const [name, setName] = useState("");
	const [workspace, setWorkspace] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(true);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	return (
		<ActionFormShell
			title="Send Slack message"
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
					<Label htmlFor="workspace">Slack workspace</Label>
					<small className="text-muted-foreground">
						Choose the Slack workspace to notify.
					</small>
				</div>
				<Select
					value={workspace}
					onValueChange={(value) => setWorkspace(value ?? "")}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select workspace" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="workspace-1">Workspace 1</SelectItem>
						<SelectItem value="workspace-2">Workspace 2</SelectItem>
						<SelectItem value="workspace-3">Workspace 3</SelectItem>
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
