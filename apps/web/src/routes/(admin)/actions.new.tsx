import { AgentPreviewPanel } from "@/components/agent/agent-preview";
import { CalendlyActionForm } from "@/components/actions/forms/calendly-action-form";
import { CalActionForm } from "@/components/actions/forms/cal-action-form";
import { SlackActionForm } from "@/components/actions/forms/slack-action-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const actionSchema = z.object({
	action: z.string().optional(),
});

export const Route = createFileRoute("/(admin)/actions/new")({
	component: RouteComponent,
	validateSearch: actionSchema,
});

function RouteComponent() {
	const { action } = Route.useSearch();
	const selectedAction =
		action === "cal" || action === "slack" || action === "calendly"
			? action
			: "calendly";

	const actionForm =
		selectedAction === "cal"
			? <CalActionForm />
			: selectedAction === "slack"
				? <SlackActionForm />
				: <CalendlyActionForm />;

	return (
		<Tabs
			defaultValue="settings"
			className="flex h-full min-h-0 w-full overflow-hidden flex-col lg:flex-row lg:gap-0">
			<div className="hidden min-h-0 lg:flex lg:w-160 lg:shrink-0 lg:border-r lg:bg-background">
				<div className="flex min-h-0 h-full w-full flex-col">
					<div className="flex-1 overflow-hidden smooth-div p-5">
						{actionForm}
					</div>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col lg:hidden">
				<div className="sticky pt-2 top-0 z-10 border-b bg-background px-6">
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
					<div className="flex-1 p-5">{actionForm}</div>
				</TabsContent>

				<TabsContent
					value="preview"
					className="mt-0 min-h-0 flex-1 overflow-hidden">
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
