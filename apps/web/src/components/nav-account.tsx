import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";

export function NavAccount({
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
    <SidebarGroup className="py-0 my-0">
      <SidebarGroupLabel className="text-muted-foreground group-data-[collapsible=icon]:hidden">
        ACCOUNT
      </SidebarGroupLabel>
      <SidebarMenu className="w-full ">
        {items.map((item) => {
          const isActive = pathname === item.url;

          return (
            <Link to={item.url} key={item.title} onClick={handleLinkClick}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={item.title}
                  className={isActive ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : ""}
                >
                  {item.icon && (
                    <item.icon
                      color="currentColor"
                      className={`size-4! ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  )}
                  <span
                    className={isActive ? "text-primary font-medium" : ""}
                  >
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
