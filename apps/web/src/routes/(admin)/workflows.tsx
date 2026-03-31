import { SearchLinear } from "@/assets/icons/search-icon";
import { NoWorkflowsPlaceholder } from "@/components/actions/no-workflow-placeholder";
import { WorkflowCard } from "@/components/actions/workflow-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/workflows")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-full w-full">
      <div className="w-full bg-background p-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto ">
          <div className="flex flex-col justify-between gap-1 sm:gap-2 sm:items-center sm:flex-row">
            <h1 className=" text-2xl font-semibold">Agent workflows</h1>
            {/* <div className="flex items-center gap-2">
              <div className="relative">
                <Input placeholder="Search actions..." className="max-w-3xl pl-9" />
                <SearchLinear className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button>
                <span className="hidden sm:inline">Create new action</span>
                <span className="sm:hidden">New action</span>
              </Button>
            </div> */}
          </div>
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-4 gap-4">
						<WorkflowCard />
					</div> */}
          <div className="mt-6 border h-70 rounded-3xl py-8 flex justify-center">
            <NoWorkflowsPlaceholder />
          </div>
        </div>
      </div>
    </div>
  );
}
