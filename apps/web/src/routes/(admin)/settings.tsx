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

export const Route = createFileRoute("/(admin)/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto ">
					<h1 className="text-2xl font-semibold">Settings</h1>

					<Tabs className="items-center pt-4" defaultValue="account">
						<TabsList className="bg-transparent gap-3">
							<TabsTrigger
								className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
								value="account">
								Account
							</TabsTrigger>
							<TabsTrigger
								className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
								value="usage">
								Usage
							</TabsTrigger>
							<TabsTrigger
								className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
								value="billing">
								Billing
							</TabsTrigger>
							<TabsTrigger
								className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
								value="team">
								Team
							</TabsTrigger>
						</TabsList>
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
