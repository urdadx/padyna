import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createPostgresState } from "@chat-adapter/state-pg";
import { getPgPool } from "@padyna/db";
import { env } from "@padyna/env/server";
import { Chat } from "chat";
import { registerTelegramHandlers } from "./handlers";
import { getTelegramWebhookUrl, isTelegramBotConfigured } from "./utils";

async function clearTelegramWebhookForPolling() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  const url = new URL(`bot${env.TELEGRAM_BOT_TOKEN}/deleteWebhook`, env.TELEGRAM_API_BASE_URL);
  const response = await fetch(url, { method: "POST" });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(
      payload?.description || `deleteWebhook failed with status ${response.status}`,
    );
  }
}

declare global {
  var __padynaTelegramBot:
    | {
        bot: Chat<{
          telegram: ReturnType<typeof createTelegramAdapter>;
        }>;
        initialized: boolean;
      }
    | undefined;
}

const telegramRuntime =
  globalThis.__padynaTelegramBot ??
  (() => {
    const bot = new Chat({
      userName: env.TELEGRAM_BOT_USERNAME,
      adapters: {
        telegram: createTelegramAdapter({
          apiBaseUrl: env.TELEGRAM_API_BASE_URL,
          botToken: env.TELEGRAM_BOT_TOKEN,
          mode: env.NODE_ENV === "production" ? "webhook" : "polling",
          secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
          userName: env.TELEGRAM_BOT_USERNAME,
        }),
      },
      state: createPostgresState({ client: getPgPool() }),
    });

    const runtime = {
      bot,
      initialized: false,
    };

    registerTelegramHandlers(bot);

    globalThis.__padynaTelegramBot = runtime;
    return runtime;
  })();

export const telegramBot = telegramRuntime.bot;

export async function initializeTelegramBot() {
  if (telegramRuntime.initialized || !isTelegramBotConfigured()) {
    return;
  }

  if (env.NODE_ENV === "production") {
    console.info("Telegram webhook endpoint", {
      webhookUrl: getTelegramWebhookUrl(),
    });
  }

  telegramRuntime.initialized = true;

  try {
    if (env.NODE_ENV !== "production") {
      await clearTelegramWebhookForPolling();
    }

    await telegramBot.initialize();
  } catch (error) {
    telegramRuntime.initialized = false;
    console.error("Telegram bot initialization failed", error);
  }
}

void initializeTelegramBot();
