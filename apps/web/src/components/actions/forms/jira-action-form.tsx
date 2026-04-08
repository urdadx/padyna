import { useEffect, useState, type FormEvent } from "react";
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

type JiraProject = {
	id: string;
	key: string;
	name: string;
};

type JiraIssueType = {
	id: string;
	name: string;
	description?: string;
	subtask?: boolean;
};

type JiraProjectsResponse = {
	values: JiraProject[];
};

export function JiraActionForm() {
	const [name, setName] = useState("");
	const [projectId, setProjectId] = useState("");
	const [issueTypeId, setIssueTypeId] = useState("");
	const [description, setDescription] = useState("");
	const [enabled, setEnabled] = useState(true);

	const {
		data: projectsData,
		isLoading: isLoadingProjects,
		error: projectsError,
	} = useQuery({
		queryKey: ["jira", "projects"],
		refetchOnMount: true,
		queryFn: async () => {
			const response = await api.get<JiraProjectsResponse>(
				"/api/integrations/jira/projects",
			);
			return response.data;
		},
	});

	const {
		data: issueTypesData,
		isLoading: isLoadingIssueTypes,
		error: issueTypesError,
	} = useQuery({
		queryKey: ["jira", "issue-types", projectId],
		enabled: projectId.length > 0,
		queryFn: async () => {
			const response = await api.get<JiraIssueType[]>(
				`/api/integrations/jira/issue-types?projectId=${encodeURIComponent(projectId)}`,
			);
			return response.data;
		},
	});

	useEffect(() => {
		setIssueTypeId("");
	}, [projectId]);

	const projects = projectsData?.values ?? [];
	const issueTypes = issueTypesData ?? [];
	const projectItems = projects.map((project) => ({
		label: `${project.name} (${project.key})`,
		value: project.id,
	}));
	const issueTypeItems = issueTypes.map((issueType) => ({
		label: issueType.subtask ? `${issueType.name} (Sub-task)` : issueType.name,
		value: issueType.id,
	}));
	const projectsMessage =
		(projectsError as AxiosError<{ message: string }>)?.response?.data?.message ?? null;
	const issueTypesMessage =
		(issueTypesError as AxiosError<{ message: string }>)?.response?.data?.message ?? null;

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
				<Label htmlFor="jira-project">
					Select project <AlertCircleIcon size={14} />
				</Label>
				{projectsMessage ? (
					<small className="text-red-500">{projectsMessage}</small>
				) : (
					<small className="text-muted-foreground">
						Choose a project from your connected Jira site.
					</small>
				)}
				<Select
					items={projectItems}
					value={projectId}
					onValueChange={(value) => setProjectId(value ?? "")}
					disabled={isLoadingProjects || projectItems.length === 0}>
					<SelectTrigger className="w-full" id="jira-project">
						<SelectValue
							placeholder={isLoadingProjects ? "Loading projects..." : "Select project"}
						/>
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
				<Label htmlFor="jira-issue-type">Select issue type</Label>
				{issueTypesMessage ? (
					<small className="text-red-500">{issueTypesMessage}</small>
				) : (
					<small className="text-muted-foreground">
						Choose which issue type this action should create.
					</small>
				)}
				<Select
					items={issueTypeItems}
					value={issueTypeId}
					onValueChange={(value) => setIssueTypeId(value ?? "")}
					disabled={!projectId || isLoadingIssueTypes || issueTypeItems.length === 0}>
					<SelectTrigger className="w-full" id="jira-issue-type">
						<SelectValue
							placeholder={
								isLoadingIssueTypes ? "Loading issue types..." : "Select issue type"
							}
						/>
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
