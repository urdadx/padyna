import { NoActionsPlaceholder } from "@/components/actions/no-action-placeholder";
import { ActionsTable } from "@/components/actions/actions-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/actions/")({
	component: RouteComponent,
});

function RouteComponent() {
	const actions = [
		{
			id: "1",
			name: "Send Slack Message",
			actionType: "jira" as const,
			status: "inactive" as const,
			timesUsed: 42,
			description: "Send a message to a Slack channel",
		},
		{
			id: "2",
			name: "Create Jira Ticket",
			actionType: "slack" as const,
			status: "inactive" as const,
			timesUsed: 28,
			description: "Create a new ticket in Jira",
		},
		{
			id: "3",
			name: "Fetch Weather Data",
			actionType: "calendly" as const,
			status: "active" as const,
			timesUsed: 15,
			description: "Get current weather for a location",
		},
	];
	const isLoading = false;

	const hasActions = actions.length > 0;

	return (
		<div className="flex h-full w-full">
			<div className="w-full bg-background p-4 lg:px-8 py-4">
				<div className="max-w-7xl mx-auto ">
					<div className="flex flex-col justify-between gap-1 sm:gap-2 sm:items-center sm:flex-row">
						<div className="flex flex-col gap-2">
							<h1 className=" text-2xl font-semibold">Agent actions</h1>
							<p className="text-sm text-muted-foreground">
								Create and manage actions that your agents can
								perform.
							</p>
						</div>
					</div>
					<div className="mt-6">
						{hasActions ? (
							<ActionsTable data={actions} isLoading={isLoading} />
						) : (
							<div className="border h-70 rounded-3xl py-8 flex justify-center">
								<NoActionsPlaceholder />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
