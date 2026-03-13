import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanUsage } from "@/components/plan-usage";
import { UserSubscriptions } from "@/components/user-subscriptions";
import { UserBillingEmail } from "@/components/user-billing-email";
import { UserInvoices } from "@/components/user-invoices";
import { Separator } from "@/components/ui/separator";
import { TeamLimits } from "@/components/team-limits";
import { AddOns } from "@/components/add-ons";
import { AccountOverview } from "@/components/account-overview";
import { TeamOverview } from "@/components/team-overview";
import { DeleteAccount } from "@/components/delete-account";
import { DeleteTeam } from "@/components/delete-team";
import { TeamMembers } from "@/components/team-member";
import { z } from "zod";

const settingsSchema = z.object({
  tab: z.enum(["account", "usage", "billing", "team"]).optional().default("account"),
});

export const Route = createFileRoute("/(admin)/settings")({
  component: RouteComponent,
  validateSearch: settingsSchema,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const handleTabChange = (value: string) => {
    navigate({
      search: {
        tab: value as "account" | "billing" | "team",
      },
    });
  };

  return (
    <div className="relative p-4 w-full space-y-6 overflow-x-hidden">
      <div className="min-h-0 flex-1 overflow-visible bg-background px-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-semibold">Settings</h1>

          <Tabs value={tab} onValueChange={handleTabChange} className="pt-3" defaultValue="account">
            <div className=" pb-1">
              <TabsList className="w-full justify-start text-foreground h-auto gap-2 rounded-none  bg-transparent px-0 ">
                <TabsTrigger
                  className="shrink-0 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                  value="account"
                >
                  Account
                </TabsTrigger>
                <TabsTrigger
                  className="shrink-0 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                  value="usage"
                >
                  Usage
                </TabsTrigger>
                <TabsTrigger
                  className="shrink-0 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                  value="billing"
                >
                  Billing
                </TabsTrigger>
                <TabsTrigger
                  className="shrink-0 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                  value="team"
                >
                  Team
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent className="py-4 space-y-8" value="account">
              <AccountOverview />
              <DeleteAccount />
            </TabsContent>
            <TabsContent className="py-4 space-y-8" value="usage">
              <PlanUsage />
              <Separator />
              <TeamLimits />
              <Separator />
              <AddOns />
            </TabsContent>
            <TabsContent className="py-4 space-y-6" value="billing">
              <UserSubscriptions />
              <UserBillingEmail />
              <UserInvoices />
            </TabsContent>
            <TabsContent className="py-4 space-y-6" value="team">
              <TeamOverview />
              <TeamMembers />
              <DeleteTeam />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
