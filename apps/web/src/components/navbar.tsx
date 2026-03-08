import { RocketLinear } from "@/assets/icons/rocket";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";
import { LetterLinear } from "@/assets/icons/letter";

export const Navbar = () => {
	return (
		<header className="flex w-full justify-between h-14 border-b top-0 px-3   shrink-0 items-center gap-2 z-40">
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
