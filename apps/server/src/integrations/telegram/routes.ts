import { env } from "@padyna/env/server";
import { Hono } from "hono";
import { telegramBot } from "./bot";
import { isTelegramBotConfigured } from "./utils";

type WaitUntilTask = Promise<unknown>;

export const telegramRoutes = new Hono();

telegramRoutes.post("/webhook", async (c) => {
  if (!isTelegramBotConfigured()) {
    return c.json({ message: "Telegram bot is not configured" }, 503);
  }

  // Without a secret token the adapter skips verification, and anyone could post fake updates
  // into tenants' conversations. Refuse webhooks until TELEGRAM_WEBHOOK_SECRET_TOKEN is set.
  if (!env.TELEGRAM_WEBHOOK_SECRET_TOKEN) {
    console.error("Telegram webhook refused: TELEGRAM_WEBHOOK_SECRET_TOKEN is not set");
    return c.json({ message: "Telegram webhook verification is not configured" }, 503);
  }

  return telegramBot.webhooks.telegram(c.req.raw, {
    waitUntil: (task: WaitUntilTask) => {
      task.catch((error: unknown) => {
        console.error("Telegram webhook task failed", error);
      });
    },
  });
});
