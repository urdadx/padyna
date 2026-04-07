import { Hono } from "hono";
import { isTelegramBotConfigured, telegramBot } from "./bot";

type WaitUntilTask = Promise<unknown>;

export const telegramRoutes = new Hono();

telegramRoutes.post("/webhook", async (c) => {
  if (!isTelegramBotConfigured()) {
    return c.json({ message: "Telegram bot is not configured" }, 503);
  }

  return telegramBot.webhooks.telegram(c.req.raw, {
    waitUntil: (task: WaitUntilTask) => {
      task.catch((error: unknown) => {
        console.error("Telegram webhook task failed", error);
      });
    },
  });
});
