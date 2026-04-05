import { CalendlyIntegrationCard } from "./calendly-integration-card";
import { TelegramIntegrationCard } from "./telegram-integration-card";
import { GithubIntegrationCard } from "./github-integration-card";
import { JiraIntegrationCard } from "./jira-integration-card";
import { DiscordIntegrationCard } from "./discord-integration-card";
import { SlackIntegrationCard } from "./slack-integration-card";
import type { IntegrationCardData } from "./types";
import { ClickupIntegrationCard } from "./clickup-integration-card";

export const IntegrationCard = ({ data }: { data: IntegrationCardData }) => {
	switch (data.id) {
		case "calendly":
			return <CalendlyIntegrationCard data={data} />;
		case "telegram":
			return <TelegramIntegrationCard data={data} />;
		case "github":
			return <GithubIntegrationCard data={data} />;
		case "jira":
			return <JiraIntegrationCard data={data} />;
		case "discord":
			return <DiscordIntegrationCard data={data} />;
		case "slack":
			return <SlackIntegrationCard data={data} />;
		case "clickup":
			return <ClickupIntegrationCard data={data} />;
		default:
			return null;
	}
};
