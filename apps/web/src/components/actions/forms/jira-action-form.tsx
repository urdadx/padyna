import { useEffect, useState, type FormEvent } from "react";
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

type CreateJiraActionResponse = {
	action: {
		id: string;
	};
};

export function JiraActionForm() {
	const navigate = useNavigate();
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

	const selectedProject = projects.find((project) => project.id === projectId) ?? null;
	const selectedIssueType =
		issueTypes.find((issueType) => issueType.id === issueTypeId) ?? null;

	const createActionMutation = useMutation({
		mutationFn: async () => {
			const response = await api.post<CreateJiraActionResponse>("/api/actions/jira", {
				name: name.trim(),
				description: description.trim(),
				enabled,
				config: {
					projectId: selectedProject!.id,
					projectKey: selectedProject!.key,
					projectName: selectedProject!.name,
					issueTypeId: selectedIssueType!.id,
					issueTypeName: selectedIssueType!.name,
				},
			});

			return response.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["actions"] });
			toast.success("Jira action created");
			navigate({ to: "/actions" });
		},
		onError: (error: any) => {
			toast.error(error.response?.data?.message || "Failed to create Jira action");
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!name.trim()) {
			toast.error("Action name is required");
			return;
		}

		if (!selectedProject) {
			toast.error("Select a Jira project");
			return;
		}

		if (!selectedIssueType) {
			toast.error("Select a Jira issue type");
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
			title="Create Jira tickets"
			enabled={enabled}
			onEnabledChange={setEnabled}
			onSubmit={handleSubmit}
			isSubmitting={createActionMutation.isPending}
			submitLabel="Save action">
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
						Choose a project from your connected Jira account.
					</small>
				)}
				<Select
					items={projectItems}
					value={projectId}
					onValueChange={(value) => setProjectId(value ?? "")}
					disabled={isLoadingProjects || projectItems.length === 0}>
					<SelectTrigger className="w-full" id="jira-project">
						<SelectValue
							placeholder={
								isLoadingProjects
									? "Loading projects..."
									: "Select project"
							}
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
					disabled={
						!projectId || isLoadingIssueTypes || issueTypeItems.length === 0
					}>
					<SelectTrigger className="w-full" id="jira-issue-type">
						<SelectValue
							placeholder={
								isLoadingIssueTypes
									? "Loading issue types..."
									: "Select issue type"
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
