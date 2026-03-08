import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/chat-logs")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-full w-full">
			<div className="w-full bg-background p-4 px-4 sm:px-6 lg:px-8 py-6">
				<div className="max-w-7xl mx-auto ">
					<h1 className="text-2xl font-semibold">Chat logs</h1>
					<p className="text-muted-foreground text-[16px] mt-2 mb-6">
						Review and manage the conversation history of your agents
					</p>
					<div></div>
				</div>
			</div>
		</div>
	);
}
