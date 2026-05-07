import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpandIcon } from "lucide-react";
import { useState } from "react";
import BarList from "./bar-list";

import { ViewAllStats } from "./view-all-stats";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { BoltLinear } from "@/assets/icons/bolt-duotone";
import { TopSkeleton } from "./top-skeleton";
import { useSearch } from "@tanstack/react-router";
import type { TimeRange } from "./top-countries";

export function TopActions() {
	const [actionsDialogOpen, setWorkflowsDialogOpen] = useState(false);

	const { timeRange } = useSearch({ from: "/(admin)/analytics" });
	const selectedTimeRange: TimeRange = (timeRange as TimeRange) || "24h";

	const { data: actions, isLoading } = useQuery(
		trpc.analytics.getTopActions.queryOptions({ limit: 10, timeRange: selectedTimeRange }),
	);

	if (isLoading) {
		return <TopSkeleton />;
	}

	const mapActions = (actions ?? []).map((action) => ({
		...action,
		icon: <BoltLinear color="black" />,
	}));

	const topWorkflows = mapActions.slice(0, 5);
	const maxTopicCount = Math.max(...mapActions.map((t) => t.value), 0);

	return (
		<div className="h-87.5 w-full rounded-xl border bg-white flex flex-col overflow-hidden">
			<Tabs defaultValue="actions" className="flex flex-col h-full">
				<div className="flex items-center justify-between px-4 py-3 shrink-0">
					<TabsList className="h-auto gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
						<TabsTrigger
							value="actions"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Top actions
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 min-h-0 overflow-hidden">
					<TabsContent value="actions" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							{mapActions.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full min-h-48 text-center">
									<p className="text-muted-foreground text-sm">
										No data available yet
									</p>
								</div>
							) : (
								<>
									<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden">
										<BarList
											tab="Actions"
											unit="mentions"
											data={topWorkflows}
											barBackground="bg-blue-200"
											hoverBackground="hover:bg-blue-50"
											maxValue={maxTopicCount}
											limit={5}
										/>
									</div>
									{mapActions.length > 5 && (
										<div className="shrink-0 px-4 py-3 ">
											<div className="flex items-center justify-center">
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setWorkflowsDialogOpen(
															true,
														)
													}
													className="text-muted-foreground">
													<ExpandIcon className="h-4 w-4 mr-1" />
													View all
												</Button>
											</div>
										</div>
									)}
								</>
							)}
						</div>
						<ViewAllStats
							name="actions"
							dialogOpen={actionsDialogOpen}
							setDialogOpen={setWorkflowsDialogOpen}
							allLinks={mapActions}
							maxTotalCount={maxTopicCount}
							bgColor="bg-blue"
						/>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
