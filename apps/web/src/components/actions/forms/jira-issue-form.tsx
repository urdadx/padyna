import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { IssueSubmittedBanner } from "@/components/chat-logs/banners";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Spinner from "@/components/ui/spinner";
import {
	collectToolOutputs,
	jiraIssueFormOutputSchema,
	type JiraIssueFormOutput,
} from "@padyna/api/actions/contracts";

export type JiraIssueFormPayload = JiraIssueFormOutput;

type JiraActionIssueResponse = {
	issue: {
		id: string;
		key: string;
	};
	issueUrl: string;
};

type JiraIssueFormProps = {
	payload: JiraIssueFormPayload;
};

export function getJiraIssueFormPayloads(parts: Array<{ output?: unknown; state?: string }>) {
	return collectToolOutputs(parts, jiraIssueFormOutputSchema);
}

export const JiraIssueForm = ({ payload }: JiraIssueFormProps) => {
	const fieldId = useId();
	const [details, setDetails] = useState("");

	const createIssueMutation = useMutation({
		mutationFn: async () => {
			const trimmedDetails = details.trim();

			const response = await api.post<JiraActionIssueResponse>(
				"/api/integrations/jira/action-issue",
				{
					actionId: payload.actionId,
					summary: trimmedDetails.slice(0, 255),
					description: trimmedDetails,
				},
			);

			return response.data;
		},
	});

	const handleSubmit = () => {
		if (!details.trim() || createIssueMutation.isPending) {
			return;
		}

		createIssueMutation.mutate();
	};

	if (createIssueMutation.isSuccess) {
		return <IssueSubmittedBanner />;
	}

	return (
		<form
			className="rounded-xl border border-gray-200 bg-background p-4"
			action={handleSubmit}>
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
						disabled={createIssueMutation.isPending}
					/>
				</div>
				<Button
					type="submit"
					className="self-end"
					disabled={createIssueMutation.isPending || !details.trim()}>
					{createIssueMutation.isPending ? (
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
