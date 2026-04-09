import { env } from "@padyna/env/server";

import { getActiveDiscordConnectionByChatbot } from "./utils";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_GUILD_TEXT_CHANNEL_TYPE = 0;
const DISCORD_CATEGORY_CHANNEL_TYPE = 4;

type DiscordApiErrorDetails = {
  message?: string;
  errors?: unknown;
  code?: number;
};

export class DiscordApiError extends Error {
  statusCode: number;
  details?: DiscordApiErrorDetails;

  constructor(message: string, statusCode: number, details?: DiscordApiErrorDetails) {
    super(message);
    this.name = "DiscordApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

type DiscordChannelResponse = {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  position?: number;
};

type DiscordMessageResponse = {
  id: string;
  channel_id: string;
};

export type DiscordNotificationAudience = "none" | "here" | "everyone";

export type DiscordChannelOption = {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  parentName: string | null;
  position: number;
};

function normalizeDiscordNotificationMessage(
  message: string,
  audience: DiscordNotificationAudience = "none",
) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return "";
  }

  const audienceTag = audience === "here" ? "@here" : audience === "everyone" ? "@everyone" : null;

  const normalizedMessage = trimmedMessage
    .replace(/^@everyone\b/i, "@everyone")
    .replace(/^@here\b/i, "@here");

  if (!audienceTag) {
    return normalizedMessage;
  }

  if (normalizedMessage.startsWith("@everyone") || normalizedMessage.startsWith("@here")) {
    return normalizedMessage;
  }

  return `${audienceTag} ${normalizedMessage}`;
}

function assertDiscordBotToken() {
  const botToken = env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    throw new DiscordApiError("Discord bot token is not configured", 503);
  }

  return botToken;
}

async function parseDiscordError(response: Response) {
  try {
    return (await response.json()) as DiscordApiErrorDetails;
  } catch {
    return undefined;
  }
}

export async function discordApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const botToken = assertDiscordBotToken();

  const response = await fetch(`${DISCORD_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const details = await parseDiscordError(response);

    throw new DiscordApiError(
      details?.message || `Discord API request failed with status ${response.status}`,
      response.status,
      details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getDiscordGuildChannels(guildId: string): Promise<DiscordChannelOption[]> {
  const channels = await discordApiFetch<DiscordChannelResponse[]>(`/guilds/${guildId}/channels`);

  const categoriesById = new Map(
    channels
      .filter((channel) => channel.type === DISCORD_CATEGORY_CHANNEL_TYPE)
      .map((channel) => [channel.id, channel.name] as const),
  );

  return channels
    .filter((channel) => channel.type === DISCORD_GUILD_TEXT_CHANNEL_TYPE)
    .sort((left, right) => {
      const leftParent = left.parent_id ?? "";
      const rightParent = right.parent_id ?? "";

      if (leftParent !== rightParent) {
        return leftParent.localeCompare(rightParent);
      }

      return (left.position ?? 0) - (right.position ?? 0);
    })
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parent_id ?? null,
      parentName: channel.parent_id ? (categoriesById.get(channel.parent_id) ?? null) : null,
      position: channel.position ?? 0,
    }));
}

export async function sendDiscordChannelMessage(input: {
  chatbotId: string;
  channelId: string;
  content: string;
  audience?: DiscordNotificationAudience;
}) {
  const connection = await getActiveDiscordConnectionByChatbot(input.chatbotId);

  if (!connection) {
    throw new DiscordApiError(
      "Discord integration is not enabled yet. Please check the integrations page",
      404,
    );
  }

  const channels = await getDiscordGuildChannels(connection.guildId);
  const selectedChannel = channels.find((channel) => channel.id === input.channelId) ?? null;

  if (!selectedChannel) {
    throw new DiscordApiError(
      "Selected Discord channel was not found in the connected server",
      404,
    );
  }

  const message = await discordApiFetch<DiscordMessageResponse>(
    `/channels/${input.channelId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: normalizeDiscordNotificationMessage(input.content, input.audience ?? "none"),
        allowed_mentions:
          input.audience === "none"
            ? { parse: [] }
            : {
                parse: ["everyone"],
              },
      }),
    },
  );

  return {
    id: message.id,
    channelId: message.channel_id,
    guildId: connection.guildId,
  };
}
