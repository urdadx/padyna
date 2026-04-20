import { useState } from "react";
import { TeamMembersTable } from "./team-members-table";
import { Button } from "../ui/button";
import { InviteMembers } from "./invite-members";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useSession } from "@/lib/auth-client";

export function TeamMembers() {
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
	const { data: session } = useSession();
	const isAdmin = session?.user.role === "admin" || session?.user.role === "owner";

	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-4 sm:px-6">
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-semibold text-foreground">Members</h3>
					{!isAdmin ? (
						<Tooltip>
							<TooltipTrigger>
								<Button
									disabled={!isAdmin}
									size="sm"
									onClick={() => setInviteDialogOpen(true)}>
									Invite members
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Only admins can invite new members.</p>
							</TooltipContent>
						</Tooltip>
					) : (
						<Button size="sm" onClick={() => setInviteDialogOpen(true)}>
							Invite members
						</Button>
					)}
				</div>
				<div className="space-y-0 my-2 relative">
					<TeamMembersTable />
				</div>
			</div>

			<InviteMembers
				isDialogOpen={inviteDialogOpen}
				setIsDialogOpen={setInviteDialogOpen}
			/>
		</div>
	);
}
