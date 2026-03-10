import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";

export function NavKnowledge({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	}[];
}) {
	const pathname = useLocation({
		select: (location) => location.pathname,
	});
	const { isMobile, setOpenMobile } = useSidebar();

	const handleLinkClick = () => {
		if (isMobile) {
			setOpenMobile(false);
		}
	};

	return (
		<SidebarGroup className="py-0 my-0 group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel className="text-muted-foreground">
				KNOWLEDGE BASE
			</SidebarGroupLabel>
			<SidebarMenu className="w-full ">
				{items.map((item) => {
					const isActive = pathname === item.url;

					return (
						<Link to={item.url} key={item.title} onClick={handleLinkClick}>
							<SidebarMenuItem>
								<SidebarMenuButton
									tooltip={item.title}
									className={
										isActive
											? "bg-purple-50 dark:bg-purple-900/30"
											: ""
									}>
									{item.icon && (
										<item.icon
											color="currentColor"
											className={`size-4! ${
												isActive
													? "text-purple-600 dark:text-purple-400"
													: "text-muted-foreground"
											}`}
										/>
									)}
									<span
										className={
											isActive
												? "text-purple-600 dark:text-purple-400 font-medium"
												: ""
										}>
										{item.title}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</Link>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
