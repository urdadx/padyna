import { SidebarTrigger } from "./ui/sidebar";
import { DeployAgentDialog } from "./deploy-agent-dialog";
import { NotificationsDropdown } from "./notifications-dropdown";

export const Navbar = () => {
	return (
		<header className="px-4 sticky top-0 flex justify-between h-14 shrink-0 items-center bg-background/50 backdrop-blur-lg border-b transition-[width,height] ease-linear z-10 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex items-center">
				<SidebarTrigger className="w-7 h-7 text-muted-foreground" />
			</div>
			<div className="flex gap-1 sm:gap-2 items-center ml-auto">
				<NotificationsDropdown />
				<DeployAgentDialog />
			</div>
		</header>
	);
};
