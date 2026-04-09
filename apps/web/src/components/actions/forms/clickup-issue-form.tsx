import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import api from "@/lib/api";
import { IssueSubmittedBanner } from "@/components/chat-logs/banners";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type ClickUpIssueFormPayload = {
	kind: "clickup_issue_form";
	actionId: string;
	chatbotId: string;
	title?: string;
	helperText?: string;
	workspaceName?: string;
	spaceName?: string;
	listName?: string;
	name?: string;
	description?: string;
};

type ClickUpActionTaskResponse = {
	task: {
		id?: string;
	};
};

type ClickUpIssueFormProps = {
	payload: ClickUpIssueFormPayload;
};

function isClickUpIssueFormPayload(value: unknown): value is ClickUpIssueFormPayload {
	if (!value || typeof value !== "object") {
		return false;
	}

	const payload = value as Record<string, unknown>;

	return (
		payload.kind === "clickup_issue_form" &&
		typeof payload.actionId === "string" &&
		typeof payload.chatbotId === "string"
	);
}

export function getClickUpIssueFormPayloads(parts: Array<{ output?: unknown; state?: string }>) {
	return parts.flatMap((part) => {
		if (part.state !== "output-available") {
			return [];
		}

		return isClickUpIssueFormPayload(part.output) ? [part.output] : [];
	});
}

export const ClickUpIssueForm = ({ payload }: ClickUpIssueFormProps) => {
	const fieldId = useId();
	const [details, setDetails] = useState("");

	const createTaskMutation = useMutation({
		mutationFn: async () => {
			const trimmedDetails = details.trim();

			const response = await api.post<ClickUpActionTaskResponse>(
				"/api/integrations/clickup/action-task",
				{
					actionId: payload.actionId,
					name: trimmedDetails.slice(0, 255),
					description: trimmedDetails,
				},
			);

			return response.data;
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!details.trim() || createTaskMutation.isPending) {
			return;
		}

		createTaskMutation.mutate();
	};

	if (createTaskMutation.isSuccess) {
		return <IssueSubmittedBanner />;
	}

	return (
		<form
			className="rounded-xl border border-gray-200 bg-background p-4"
			onSubmit={handleSubmit}>
			<div className="mb-5 flex flex-col gap-1">
				<h2 className="text-lg font-semibold">Create a support ticket</h2>
				<small className="text-sm text-muted-foreground">
					Our team will review your request shortly
				</small>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<Label htmlFor={fieldId} className="text-sm font-medium">
						What can we help with?
					</Label>
					<Textarea
						id={fieldId}
						placeholder="Describe your issue in detail..."
						className="resize-none"
						value={details}
						onChange={(event) => setDetails(event.target.value)}
						disabled={createTaskMutation.isPending}
					/>
				</div>
				<Button
					type="submit"
					className="self-end"
					disabled={createTaskMutation.isPending || !details.trim()}>
					{createTaskMutation.isPending ? (
						<>
							<Spinner className="text-white" />
							Creating...
						</>
					) : (
						"Create issue"
					)}
				</Button>
			</div>
		</form>
	);
};
