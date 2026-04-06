import { useState, type FormEvent } from "react";
import { AlertCircleIcon } from "lucide-react";

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

export function JiraActionForm() {
	const [name, setName] = useState("");
	const [projects, setProjects] = useState("");
	const [issueTypes, setIssueTypes] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(true);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	return (
		<ActionFormShell
			title="Create Jira tickets"
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
				<Label htmlFor="projects">
					Select project <AlertCircleIcon size={14} />
				</Label>
				<Select
					value={projects}
					onValueChange={(value) => setProjects(value ?? "")}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select project" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="project1">Project 1</SelectItem>
						<SelectItem value="project2">Project 2</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="projects">Select issue type</Label>
				<Select
					value={issueTypes}
					onValueChange={(value) => setIssueTypes(value ?? "")}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select issue type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="issue1">Task</SelectItem>
						<SelectItem value="issue2">Bug</SelectItem>
						<SelectItem value="issue3">Story</SelectItem>
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
