import { RocketLinear } from "@/assets/icons/rocket";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";
import { LetterLinear } from "@/assets/icons/letter";

export const Navbar = () => {
	return (
		<header className="px-4 sticky top-0 flex justify-between h-14 shrink-0 items-center  bg-background/50 backdrop-blur-lg border-b transition-[width,height] ease-linear z-10 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex items-center">
				<SidebarTrigger className=" w-7 h-7 text-muted-foreground " />
			</div>
			<div className="flex gap-1 sm:gap-2  items-center ml-auto">
				<Button className="h-9" size="sm">
					<LetterLinear color="white" className="size-4" />
					Invite your team
				</Button>
				<Button
					className="text-primary h-9 font-normal hover:text-primary"
					variant="outline">
					<RocketLinear color="#8b5cf6" className="size-4" />
					Deploy your agent
				</Button>
			</div>
		</header>
	);
};
