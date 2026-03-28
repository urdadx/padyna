import { env } from "@padyna/env/server";

export const PLAN_LIMITS: Record<
  string,
  { maxChatbots: number; maxMembers: number; maxDataSourceSize: number }
> = {
  [env.STARTER_MONTHLY_PLAN ?? ""]: {
    maxChatbots: 1,
    maxMembers: 1,
    maxDataSourceSize: 20 * 1024 * 1024,
  },
  [env.STARTER_YEARLY_PLAN ?? ""]: {
    maxChatbots: 1,
    maxMembers: 1,
    maxDataSourceSize: 20 * 1024 * 1024,
  },
  [env.GROWTH_MONTHLY_PLAN ?? ""]: {
    maxChatbots: 3,
    maxMembers: 4,
    maxDataSourceSize: 100 * 1024 * 1024,
  },
  [env.GROWTH_YEARLY_PLAN ?? ""]: {
    maxChatbots: 3,
    maxMembers: 4,
    maxDataSourceSize: 100 * 1024 * 1024,
  },
  [env.PRO_MONTHLY_PLAN ?? ""]: {
    maxChatbots: 5,
    maxMembers: 10,
    maxDataSourceSize: 400 * 1024 * 1024,
  },
  [env.PRO_YEARLY_PLAN ?? ""]: {
    maxChatbots: 5,
    maxMembers: 10,
    maxDataSourceSize: 400 * 1024 * 1024,
  },
};

export const ADDON_LIMITS: Record<string, { maxChatbots?: number; maxMembers?: number }> = {
  [env.EXTRA_CHATBOT_ADDON ?? ""]: { maxChatbots: 1 },
  [env.EXTRA_TEAM_MEMBER_ADDON ?? ""]: { maxMembers: 1 },
};
