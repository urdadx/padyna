import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon?: any;
		items?: {
			title: string;
			url: string;
		}[];
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
		<SidebarGroup className="py-0 my-0 mt-2">
			<SidebarMenu>
				{items.map((item) => {
					const isMainItemActive = pathname === item.url;

					return (
						<div key={item.title}>
							<SidebarMenuItem>
								<Link
									to={item.url}
									className="w-full"
									onClick={handleLinkClick}>
									<SidebarMenuButton
										tooltip={item.title}
										className={
											isMainItemActive
												? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
												: ""
										}>
										{item.icon && (
											<item.icon
												color="currentColor"
												className={`size-4! text-muted-foreground ${
													isMainItemActive
														? "text-primary"
														: ""
												}`}
											/>
										)}
										<span
											className={
												isMainItemActive
													? "text-primary font-medium"
													: ""
											}>
											{item.title}
										</span>
									</SidebarMenuButton>
								</Link>
								<div className="">
									{item.items?.map((subItem) => {
										const isSubItemActive =
											pathname === subItem.url;

										return (
											<SidebarMenuButton
												key={subItem.title}
												className={
													isSubItemActive
														? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
														: ""
												}>
												<Link
													to={subItem.url}
													className="w-full"
													onClick={
														handleLinkClick
													}>
													<span
														className={
															isSubItemActive
																? "text-primary font-medium"
																: ""
														}>
														{subItem.title}
													</span>
												</Link>
											</SidebarMenuButton>
										);
									})}
								</div>
							</SidebarMenuItem>
						</div>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
