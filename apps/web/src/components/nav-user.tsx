import { ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { SwitchLinear } from "@/assets/icons/switch-icon";

export function NavUser({
	user,
}: {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
}) {
	return (
		<SidebarMenu>
			<SidebarMenuItem className="w-full">
				<DropdownMenu>
					<DropdownMenuTrigger className="w-full">
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-md w-full">
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="rounded-lg">
									AK
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{user.name}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) space-y-1  min-w-58 rounded-sm"
						align="end"
						sideOffset={4}>
						<DropdownMenuItem className="text-sm">
							<UserLinear />
							My Account
						</DropdownMenuItem>
						<DropdownMenuItem className="text-sm">
							<CardLinear />
							Manage Subscriptions
						</DropdownMenuItem>
						<DropdownMenuItem className="text-sm">
							<SwitchLinear />
							Switch Teams
						</DropdownMenuItem>
						<DropdownMenuItem className="text-sm">
							<LogoutLinear color="red" />
							<span className="text-red-500 hover:text-red-500">
								Logout
							</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
