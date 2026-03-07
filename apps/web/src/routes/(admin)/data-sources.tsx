import { DataSourceTable } from "@/components/datasource-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/data-sources")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-full w-full">
			<div className="w-full bg-background p-4 px-4 sm:px-6 lg:px-8 py-6">
				<div className="max-w-7xl mx-auto ">
					<h1 className="text-2xl font-semibold">Data Sources</h1>
					<p className="text-muted-foreground text-[16px] mt-2 mb-6">
						Manage data sources your AI agent can use as their knowledge
						base
					</p>
					<DataSourceTable />
				</div>
			</div>
		</div>
	);
}
