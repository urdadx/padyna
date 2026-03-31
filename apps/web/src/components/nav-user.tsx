import { ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { LogoutLinear } from "@/assets/icons/logout-icon";
import { UserLinear } from "@/assets/icons/user-icon";
import { CardLinear } from "@/assets/icons/card";
import { authClient, useSession } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SwitchTeamsDialog } from "./team/switch-teams-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteMembers } from "./team/invite-members";
import { LetterLinear } from "@/assets/icons/letter";
import { queryClient, trpc } from "@/utils/trpc";

export function NavUser() {
	const navigate = useNavigate();
	const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<SidebarMenu>
				<SidebarMenuItem className="w-full">
					<div className="flex items-center gap-2 p-2 w-full">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div className="flex flex-col gap-1 flex-1">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-2 w-28" />
						</div>
						<Skeleton className="h-4 w-4" />
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	const user = session?.user || { name: "User", email: "", image: "" };

	const handleLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					await queryClient.invalidateQueries(
						trpc.auth.getSession.queryOptions(),
					);
					navigate({
						to: "/login",
					});
				},
			},
		});
	};

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem className="w-full">
					<DropdownMenu>
						<DropdownMenuTrigger className="w-full">
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-md w-full">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										src={
											user.image ||
											`https://api.dicebear.com/9.x/glass/svg?seed=${user.name}`
										}
										alt={user.name}
										className="rounded-lg w-full h-full"
									/>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">
										{user.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{user.email}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) space-y-1  min-w-58 rounded-sm"
							align="end"
							sideOffset={4}>
							<DropdownMenuItem
								onClick={() =>
									navigate({
										to: "/settings",
									})
								}
								className="text-sm">
								<UserLinear />
								My Account
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									navigate({
										// @ts-ignore
										to: "/settings?tab=billing",
									})
								}
								className="text-sm">
								<CardLinear />
								Manage Subscriptions
							</DropdownMenuItem>
							{/* <DropdownMenuItem onClick={() => setShowTeamSwitcher(true)} className="text-sm">
                <SwitchLinear />
                Switch Teams
              </DropdownMenuItem> */}
							<DropdownMenuItem
								onClick={() => setInviteDialogOpen(true)}
								className="text-sm">
								<LetterLinear />
								Invite Team
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={handleLogout}
								className="text-sm">
								<LogoutLinear color="red" />
								<span className="text-red-500 hover:text-red-500">
									Logout
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			<SwitchTeamsDialog open={showTeamSwitcher} onOpenChange={setShowTeamSwitcher} />
			<InviteMembers
				isDialogOpen={inviteDialogOpen}
				setIsDialogOpen={setInviteDialogOpen}
			/>
		</>
	);
}
