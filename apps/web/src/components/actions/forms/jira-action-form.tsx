import { useState, type FormEvent } from "react";
import { AlertCircleIcon } from "lucide-react";

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

const projectItems = [
	{ label: "Project 1", value: "project1" },
	{ label: "Project 2", value: "project2" },
];

const issueTypeItems = [
	{ label: "Task", value: "issue1" },
	{ label: "Bug", value: "issue2" },
	{ label: "Story", value: "issue3" },
];

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
					items={projectItems}
					value={projects}
					onValueChange={(value) => setProjects(value ?? "")}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select project" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Projects</SelectLabel>
							{projectItems.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="projects">Select issue type</Label>
				<Select
					items={issueTypeItems}
					value={issueTypes}
					onValueChange={(value) => setIssueTypes(value ?? "")}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select issue type" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Issue types</SelectLabel>
							{issueTypeItems.map((item) => (
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
