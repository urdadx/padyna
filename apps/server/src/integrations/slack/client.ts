import { slackAdapter, initializeSlackBot, slackBot } from "./bot";

export class SlackApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "SlackApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

type SlackChannelsResponse = {
  ok?: boolean;
  error?: string;
  channels?: Array<{
    id?: string;
    name?: string;
    is_private?: boolean;
  }>;
};

type SlackJoinResponse = {
  ok?: boolean;
  error?: string;
};

async function getSlackInstallation(teamId: string) {
  await initializeSlackBot();

  const installation = await slackAdapter.getInstallation(teamId);
  if (!installation) {
    throw new SlackApiError("Slack workspace is not installed", 404);
  }

  return installation;
}

export async function getSlackChannels(teamId: string) {
  const installation = await getSlackInstallation(teamId);

  const response = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200",
    {
      headers: {
        Authorization: `Bearer ${installation.botToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new SlackApiError(`Failed to load Slack channels: ${response.status} ${errorText}`, 502);
  }

  const data = (await response.json()) as SlackChannelsResponse;
  if (!data.ok) {
    throw new SlackApiError("Failed to load Slack channels", 502, data.error);
  }

  return (data.channels ?? [])
    .filter((channel) => typeof channel.id === "string" && typeof channel.name === "string")
    .map((channel) => ({
      id: channel.id as string,
      name: channel.name as string,
      isPrivate: Boolean(channel.is_private),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function joinSlackChannel(teamId: string, channelId: string) {
  const installation = await getSlackInstallation(teamId);

  const response = await fetch("https://slack.com/api/conversations.join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${installation.botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new SlackApiError(`Failed to join Slack channel: ${response.status} ${errorText}`, 502);
  }

  const data = (await response.json()) as SlackJoinResponse;
  if (!data.ok && data.error !== "already_in_channel" && data.error !== "method_not_supported_for_channel_type") {
    throw new SlackApiError("Failed to join Slack channel", 502, data.error);
  }
}

export async function postSlackChannelMessage(teamId: string, channelId: string, message: string) {
  const installation = await getSlackInstallation(teamId);

  try {
    await slackAdapter.withBotToken(installation.botToken, async () => {
      await slackBot.channel(`slack:${channelId}`).post(message);
    });
  } catch (error) {
    throw new SlackApiError("Failed to post Slack channel message", 502, error);
  }
}
