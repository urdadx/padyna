import { SidebarTrigger } from "./ui/sidebar";

export const Navbar = () => {
	return (
		<header className="flex w-full justify-between h-14 border-b top-0 px-3 pt-2  shrink-0 items-center gap-2 z-40">
			<div className="flex items-center">
				<SidebarTrigger className=" w-7 h-7 text-muted-foreground " />
			</div>
			<div className="flex gap-1 sm:gap-2  items-center ml-auto"></div>
		</header>
	);
};
