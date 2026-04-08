import { createSlackAdapter } from "@chat-adapter/slack";
import { createPostgresState } from "@chat-adapter/state-pg";
import { getPgPool } from "@padyna/db";
import { env } from "@padyna/env/server";
import { Chat } from "chat";
import { registerSlackHandlers } from "./handlers";

declare global {
  var __padynaSlackBot:
    | {
        bot: Chat<{
          slack: ReturnType<typeof createSlackAdapter>;
        }>;
      }
    | undefined;
}

const slackRuntime =
  globalThis.__padynaSlackBot ??
  (() => {
    const adapterConfig = {
      ...(env.SLACK_CLIENT_ID ? { clientId: env.SLACK_CLIENT_ID } : {}),
      ...(env.SLACK_CLIENT_SECRET ? { clientSecret: env.SLACK_CLIENT_SECRET } : {}),
      ...(env.SLACK_SIGNING_SECRET ? { signingSecret: env.SLACK_SIGNING_SECRET } : {}),
      ...(env.SLACK_ENCRYPTION_KEY ? { encryptionKey: env.SLACK_ENCRYPTION_KEY } : {}),
    };

    const bot = new Chat({
      userName: "Padyna",
      adapters: {
        slack: createSlackAdapter(adapterConfig),
      },
      state: createPostgresState({ client: getPgPool() }),
    });

    registerSlackHandlers(bot);

    const runtime = { bot };
    globalThis.__padynaSlackBot = runtime;
    return runtime;
  })();

export const slackBot = slackRuntime.bot;

export const slackAdapter = slackBot.getAdapter("slack");

export async function initializeSlackBot() {
  await slackBot.initialize();
}
