import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function ChatbotSwitcher() {
	const activeBot = {
		name: "Padyna Bot",
		avatar: "/avatars/activeBot-a.jpg",
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem className="w-full">
				<DropdownMenu>
					<DropdownMenuTrigger className="w-full">
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-md w-full">
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage
									src={activeBot.avatar}
									alt={activeBot.name}
								/>
								<AvatarFallback className="rounded-lg bg-primary text-white font-semibold">
									P
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate ">{activeBot.name}</span>
							</div>
							<ChevronDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width)  min-w-56 rounded-sm"
						side={"bottom"}
						align="end"
						sideOffset={4}>
						<DropdownMenuItem className="text-sm">
							<div className="rounded-full w-2 h-2 bg-orange-500" />
							Padyna Bot
						</DropdownMenuItem>
						<DropdownMenuItem className="text-sm">
							<div className="rounded-full w-2 h-2 bg-green-500" />
							Jack Bot
						</DropdownMenuItem>
						<DropdownMenuItem className="text-sm">
							<div className="rounded-full w-2 h-2 bg-blue-500" />
							Ruth Bot
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
