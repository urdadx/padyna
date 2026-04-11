import { AgentPreviewPanel } from "@/components/agent/agent-preview";
import { CalendlyActionForm } from "@/components/actions/forms/calendly-action-form";
import { CalActionForm } from "@/components/actions/forms/cal-action-form";
import { ClickUpActionForm } from "@/components/actions/forms/clickup-action-form";
import { DiscordActionForm } from "@/components/actions/forms/discord-action-form";
import { JiraActionForm } from "@/components/actions/forms/jira-action-form";
import { SlackActionForm } from "@/components/actions/forms/slack-action-form";
import type {
	ActionFormInitialData,
	CalActionConfig,
	CalendlyActionConfig,
	ClickUpActionConfig,
	DiscordActionConfig,
	JiraActionConfig,
	SlackActionConfig,
	WebActionRecord,
} from "@/components/actions/forms/types";
import Spinner from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

type ActionResponse = {
	action: WebActionRecord;
};

export const Route = createFileRoute("/(admin)/actions/$actionId/edit")({
	component: RouteComponent,
});

function renderActionForm(action: WebActionRecord) {
	switch (action.provider) {
		case "jira":
			return (
				<JiraActionForm
					mode="edit"
					actionId={action.id}
					initialAction={action as ActionFormInitialData<JiraActionConfig>}
				/>
			);
		case "calendly":
			return (
				<CalendlyActionForm
					mode="edit"
					actionId={action.id}
					initialAction={action as ActionFormInitialData<CalendlyActionConfig>}
				/>
			);
		case "cal":
			return (
				<CalActionForm
					mode="edit"
					actionId={action.id}
					initialAction={action as ActionFormInitialData<CalActionConfig>}
				/>
			);
		case "clickup":
			return (
				<ClickUpActionForm
					mode="edit"
					actionId={action.id}
					initialAction={action as ActionFormInitialData<ClickUpActionConfig>}
				/>
			);
		case "discord":
			return (
				<DiscordActionForm
					mode="edit"
					actionId={action.id}
					initialAction={action as ActionFormInitialData<DiscordActionConfig>}
				/>
			);
		case "slack":
			return (
				<SlackActionForm
					mode="edit"
					actionId={action.id}
					initialAction={action as ActionFormInitialData<SlackActionConfig>}
				/>
			);
	}
	return null;
}

function RouteComponent() {
	const { actionId } = Route.useParams();
	const { data, isLoading, error } = useQuery({
		queryKey: ["actions", actionId],
		refetchOnMount: true,
		queryFn: async () => {
			const response = await api.get<ActionResponse>(`/api/actions/${actionId}`);
			return response.data;
		},
	});

	const actionForm = data?.action ? renderActionForm(data.action) : null;
	const errorMessage = (error as any)?.response?.data?.message || "Failed to load action";

	return (
		<Tabs
			defaultValue="settings"
			className="flex h-full min-h-0 w-full overflow-hidden flex-col lg:flex-row lg:gap-0">
			<div className="hidden min-h-0 lg:flex lg:w-160 lg:shrink-0 lg:border-r lg:bg-background">
				<div className="flex min-h-0 h-full w-full flex-col">
					<div className="flex-1 overflow-hidden smooth-div p-5">
						{isLoading ? (
							<div className="flex h-full items-center justify-center">
								<Spinner size={28} />
							</div>
						) : actionForm ? (
							actionForm
						) : (
							<p className="text-sm text-muted-foreground">{errorMessage}</p>
						)}
					</div>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col lg:hidden">
				<div className="sticky top-0 z-10 border-b bg-background px-6 pt-2">
					<TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b-0 bg-transparent p-0 text-sm">
						<TabsTrigger
							value="settings"
							className="rounded-none border-b-2 border-transparent px-0 pb-4 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
							Settings
						</TabsTrigger>
						<TabsTrigger
							value="preview"
							className="rounded-none border-b-2 border-transparent px-0 pb-4 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
							Preview
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent
					value="settings"
					className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
					<div className="flex-1 p-5">
						{isLoading ? (
							<div className="flex h-full items-center justify-center">
								<Spinner size={28} />
							</div>
						) : actionForm ? (
							actionForm
						) : (
							<p className="text-sm text-muted-foreground">{errorMessage}</p>
						)}
					</div>
				</TabsContent>

				<TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden">
					<aside
						className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[28px_28px]"
						aria-label="Preview panel">
						<AgentPreviewPanel />
					</aside>
				</TabsContent>
			</div>

			<div className="hidden min-h-0 flex-1 overflow-hidden lg:flex">
				<aside
					className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[28px_28px]"
					aria-label="Preview panel">
					<AgentPreviewPanel />
				</aside>
			</div>
		</Tabs>
	);
}
