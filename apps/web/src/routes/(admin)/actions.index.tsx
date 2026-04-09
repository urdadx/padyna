import api from "@/lib/api";
import { NoActionsPlaceholder } from "@/components/actions/no-action-placeholder";
import { ActionsTable, type ActionRow } from "@/components/actions/actions-table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

type ActionsResponse = {
  actions: ActionRow[];
};

export const Route = createFileRoute("/(admin)/actions/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ["actions"],
    refetchOnMount: true,
    queryFn: async () => {
      const response = await api.get<ActionsResponse>("/api/actions");
      return response.data;
    },
  });

  const actions = data?.actions ?? [];
  const hasActions = isLoading || actions.length > 0;

  return (
    <div className="flex h-full w-full">
      <div className="w-full bg-background p-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto ">
          <div className="flex flex-col justify-between gap-1 sm:gap-2 sm:items-center sm:flex-row">
            <div className="flex flex-col gap-2">
              <h1 className=" text-2xl font-semibold">Agent actions</h1>
              <p className="text-sm text-muted-foreground">
                Create and manage actions that your agents can perform.
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
