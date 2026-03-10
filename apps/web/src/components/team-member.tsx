import { TeamMembersTable } from "./team-members-table";
import { PremiumOverviewTable } from "./test-table";
import { Button } from "./ui/button";

export function TeamMembers() {
	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-4 sm:px-6">
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-semibold text-foreground">Members</h3>
					<Button size="sm">Invite members</Button>
				</div>
				<div className="space-y-0 my-2 relative">
					<TeamMembersTable />
					{/* <PremiumOverviewTable /> */}
				</div>
			</div>
		</div>
	);
}
