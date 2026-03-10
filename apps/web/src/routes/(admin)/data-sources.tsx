import { DataSourceTable } from "@/components/datasource-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/data-sources")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="max-w-7xl mx-auto">
				<h1 className="text-2xl font-semibold mb-4 lg:mb-6">Data Sources</h1>

				<DataSourceTable />
			</div>
		</div>
	);
}
