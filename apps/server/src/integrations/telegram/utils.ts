import { env } from "@padyna/env/server";

export function isTelegramBotConfigured() {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
}

export function getTelegramWebhookUrl(): string {
  const baseUrl = new URL(env.BETTER_AUTH_URL);
  return new URL("/api/integrations/telegram/webhook", baseUrl).toString();
}
