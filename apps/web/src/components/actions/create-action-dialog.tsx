import CalendlyImg from "@/assets/calendly.png";
import CalImg from "@/assets/cal.avif";
import DiscordImg from "@/assets/discord.png";
import SlackImg from "@/assets/slack.png";
import JiraImg from "@/assets/jira.png";
import ClickUpImg from "@/assets/clickup.png";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTrigger,
	DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "../ui/input";
import { ActionCard } from "./action-card";

interface ActionData {
	href: string;
	search?: { action: string };
	comingSoon?: boolean;
	icon?: React.ReactNode;
	iconSrc?: string;
	title: string;
	description: string;
}

export const CreateActionDialog = () => {
	const [searchTerm, setSearchTerm] = useState("");

	const actions: ActionData[] = [
		{
			href: "/actions/new",
			search: { action: "calendly" },
			iconSrc: CalendlyImg,
			title: "Get Calendly booking slots",
			description: "Allow customers to book meetings via Calendly",
		},
		{
			href: "/actions/new",
			search: { action: "slack" },
			iconSrc: SlackImg,
			title: "Send Slack message",
			description: "Send notifications and messages to a Slack channel",
		},
		{
			href: "/actions/new",
			search: { action: "jira" },
			iconSrc: JiraImg,
			title: "Create Jira Ticket",
			description: "Allow customers to create support tickets in Jira",
		},

		{
			href: "/actions/new",
			search: { action: "cal" },
			iconSrc: CalImg,
			title: "Get Cal.com booking slots",
			description: "Allow customers to book meetings via Cal.com",
		},
		{
			href: "/actions/new",
			search: { action: "clickup" },
			iconSrc: ClickUpImg,
			title: "Create ClickUp task",
			description: "Allow customers to create support tickets in ClickUp",
		},

		{
			href: "/actions/new",
			search: { action: "discord" },
			iconSrc: DiscordImg,
			title: "Send Discord message",
			description: "Send notifications and messages to a Discord channel",
		},
	];

	const filteredActions = actions.filter(
		(action) =>
			action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			action.description.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<Dialog>
			<DialogTrigger>
				<Button className="font-medium">Create new action</Button>
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-xl! p-0 gap-0 animate-scale-in">
				<DialogHeader className="px-6 py-4 border-border">
					<DialogTitle className="font-semibold text-xl text-foreground">
						Create a new action
					</DialogTitle>
					<Input
						className="mt-2"
						type="text"
						placeholder="Search actions..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</DialogHeader>
				<div className="max-h-[75vh] flex-1 smooth-div">
					<div className="px-6 pt-2 pb-6">
						<div className="flex flex-col gap-3">
							{filteredActions.length > 0 ? (
								filteredActions.map((action, index) => (
									<ActionCard
										key={index}
										href={action.href}
										search={action.search}
										comingSoon={action.comingSoon}
										icon={action.icon}
										iconSrc={action.iconSrc}
										title={action.title}
										description={action.description}
									/>
								))
							) : (
								<div className="text-center py-8">
									<p className="text-muted-foreground">
										No actions found matching your search.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
