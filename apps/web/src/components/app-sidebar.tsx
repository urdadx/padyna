import * as React from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { NavMain } from "./nav-main";
import { Outlet } from "@tanstack/react-router";
import { Navbar } from "./navbar";
import { NavKnowledge } from "./nav-knowledge";
import { HomeLinear } from "@/assets/icons/home-duotone";
import { ChatbotSwitcher } from "./agent/chatbot-switcher";
import { HammerLinear } from "@/assets/icons/hammer-duotone";
import { BoltLinear } from "@/assets/icons/bolt-duotone";
import { NavActivity } from "./nav-activity";
import { IntegrationLinear } from "@/assets/icons/integration-icon";
import { ChatLogsIcon } from "@/assets/icons/chatlogs-icon";
import { NavAccount } from "./nav-account";
import { ChartLinear } from "@/assets/icons/chart-icon";
import { SettingsLinear } from "@/assets/icons/settings-duotone";
import { DatabaseLinear } from "@/assets/icons/database-icon";
import { NavPlayground } from "./nav-playground";

const data = {
	overview: [
		{
			title: "Overview",
			url: "/overview",
			icon: HomeLinear,
		},
	],
	playground: [
		{
			title: "Playground",
			url: "/playground",
			icon: HammerLinear,
		},
	],
	knowledge: [
		{
			title: "Data sources",
			url: "/data-sources",
			icon: DatabaseLinear,
		},
		// {
		// 	title: "Topics",
		// 	url: "/topic",
		// 	icon: SearchLinear,
		// },
	],
	activity: [
		{
			title: "Chat logs",
			url: "/chat-logs",
			icon: ChatLogsIcon,
		},
		{
			title: "Analytics",
			url: "/analytics",
			icon: ChartLinear,
		},
		{
			title: "Custom actions",
			url: "/actions",
			icon: BoltLinear,
		},
	],
	account: [
		{
			title: "Settings",
			url: "/settings",
			icon: SettingsLinear,
		},
		{
			title: "Integrations",
			url: "/integrations",
			icon: IntegrationLinear,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<SidebarProvider>
			<Sidebar collapsible="offcanvas" {...props}>
				<SidebarHeader>
					<ChatbotSwitcher />
				</SidebarHeader>
				<SidebarContent className="">
					<NavMain items={data.overview} />
					<NavPlayground items={data.playground} />
					<NavKnowledge items={data.knowledge} />
					<NavActivity items={data.activity} />
					<NavAccount items={data.account} />
				</SidebarContent>
				<SidebarFooter>
					<NavUser />
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="min-h-0 flex flex-col">
				<Navbar />
				<div className="flex-1 overflow-auto">
					<Outlet />
				</div>{" "}
			</SidebarInset>
		</SidebarProvider>
	);
}
