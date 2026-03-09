import { AgentPreviewPanel } from "@/components/agent-preview";
import { AgentSettingsPanel } from "@/components/agent-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/playground")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Tabs
			defaultValue="settings"
			className="flex h-full min-h-0 w-full overflow-hidden flex-col lg:flex-row lg:gap-0">
			<div className="hidden min-h-0 lg:flex lg:w-100 lg:shrink-0 lg:border-r lg:bg-background">
				<div className="flex min-h-0 h-full w-full flex-col">
					<div className="flex-1  smooth-div p-5 ">
						<AgentSettingsPanel />
					</div>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col lg:hidden">
				<header className="bg-background px-6 pt-6">
					<h1 className="pb-4 text-2xl font-semibold tracking-tight">
						Playground
					</h1>
				</header>
				<div className="sticky top-0 z-10 border-b bg-background px-6">
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
					className="mt-0 flex min-h-0 flex-1 flex-col bg-background">
					<div className="flex-1 overflow-y-auto p-5">
						<AgentSettingsPanel />
					</div>
				</TabsContent>

				<TabsContent
					value="preview"
					className="mt-0 min-h-0 flex-1 overflow-hidden">
					<AgentPreviewPanel />
				</TabsContent>
			</div>

			<div className="hidden min-h-0 flex-1 overflow-hidden lg:flex">
				<AgentPreviewPanel />
			</div>
		</Tabs>
	);
}
