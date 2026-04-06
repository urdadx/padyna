import { createDiscordAdapter } from "@chat-adapter/discord";
import { createPostgresState } from "@chat-adapter/state-pg";
import { getPgPool } from "@padyna/db";
import { env } from "@padyna/env/server";
import { Chat } from "chat";
import { registerDiscordHandlers } from "./handlers";
import { getDiscordWebhookUrl, isDiscordBotConfigured } from "./utils";

type WaitUntilTask = Promise<unknown>;

declare global {
  var __padynaDiscordBot:
    | {
        bot: Chat<{
          discord: ReturnType<typeof createDiscordAdapter>;
        }>;
        cronRegistered: boolean;
      }
    | undefined;
}

const discordRuntime =
  globalThis.__padynaDiscordBot ??
  (() => {
    const bot = new Chat({
      userName: "Padyna",
      adapters: {
        discord: createDiscordAdapter({
          applicationId: env.DISCORD_APPLICATION_ID,
          botToken: env.DISCORD_BOT_TOKEN,
          publicKey: env.DISCORD_PUBLIC_KEY,
        }),
      },
      state: createPostgresState({ client: getPgPool() }),
    });

    const runtime = {
      bot,
      cronRegistered: false,
    };

    registerDiscordHandlers(bot);

    globalThis.__padynaDiscordBot = runtime;
    return runtime;
  })();

export const discordBot = discordRuntime.bot;

export async function startDiscordGatewayListener() {
  if (!isDiscordBotConfigured()) {
    return;
  }

  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  await discordBot.initialize();

  const discordAdapter = discordBot.getAdapter("discord");
  await discordAdapter.startGatewayListener(
    {
      waitUntil: (task: WaitUntilTask) => {
        task.catch((error: unknown) => {
          console.error("Discord gateway listener task failed", error);
        });
      },
    },
    10 * 60 * 1000,
    undefined,
    webhookUrl,
  );
}

export function registerDiscordGatewayCron() {
  if (discordRuntime.cronRegistered || !isDiscordBotConfigured()) {
    return;
  }

  const NINE_MINUTES = 9 * 60 * 1000;

  setInterval(async () => {
    try {
      await startDiscordGatewayListener();
    } catch (error) {
      console.error("Discord gateway listener failed", error);
    }
  }, NINE_MINUTES);

  discordRuntime.cronRegistered = true;

  void startDiscordGatewayListener().catch((error) => {
    console.error("Initial Discord gateway listener failed", error);
  });
}
