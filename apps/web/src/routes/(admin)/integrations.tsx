import { IntegrationCard } from "@/components/integrations/integration-card";
import { createFileRoute } from "@tanstack/react-router";
import CalendlyLogo from "@/assets/calendly.png";
import DiscordLogo from "@/assets/discord.png";
import SlackLogo from "@/assets/slack.png";
import TelegramLogo from "@/assets/telegram.png";
import GithubLogo from "@/assets/github.png";

export const Route = createFileRoute("/(admin)/integrations")({
	component: RouteComponent,
});

function RouteComponent() {
	const integrations = [
		{
			id: "telegram",
			name: "Telegram",
			description: "Connect your agent to Telegram to manage conversations",
			logo: TelegramLogo,
		},
		{
			id: "github",
			name: "GitHub",
			description:
				"Connect your codebase to your agent for code-related queries and tasks",
			logo: GithubLogo,
		},
		{
			id: "calendly",
			name: "Calendly",
			description: "Connect your agent to Calendly to manage bookings and meetings.",
			logo: CalendlyLogo,
		},
		{
			id: "discord",
			name: "Discord",
			description:
				"Connect your agent to Discord to manage conversations and send notifications",
			logo: DiscordLogo,
		},
		{
			id: "slack",
			name: "Slack",
			description:
				"Connect your agent to Slack to manage conversations and send notifications",
			logo: SlackLogo,
		},
	];

	return (
		<div className="px-4 sm:px-12 py-6 min-h-screen">
			<div className="w-full min-h-screen">
				<div className="w-full max-w-7xl mx-auto space-y-6">
					<div className="flex flex-col gap-1">
						<h2 className="text-2xl font-semibold ">Integrations</h2>
						<p className="text-muted-foreground text-sm">
							Connect third-party services to your agents for enhanced
							functionality and workflow
						</p>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{integrations.map((integration) => (
							<IntegrationCard
								data={integration}
								key={integration.id}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
