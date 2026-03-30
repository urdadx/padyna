import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_WEBHOOK_SECRET: z.string().min(1),
    POLAR_SUCCESS_URL: z.url(),
    CORS_ORIGIN: z.url(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    SCRAPER_URL: z.url().default("https://scraper.padyna.com"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    STARTER_MONTHLY_PLAN: z.string().optional(),
    STARTER_YEARLY_PLAN: z.string().optional(),
    GROWTH_MONTHLY_PLAN: z.string().optional(),
    GROWTH_YEARLY_PLAN: z.string().optional(),
    PRO_MONTHLY_PLAN: z.string().optional(),
    PRO_YEARLY_PLAN: z.string().optional(),
    EXTRA_CHATBOT_ADDON: z.string().optional(),
    EXTRA_TEAM_MEMBER_ADDON: z.string().optional(),
    POLAR_API_URL: z.url().default("https://sandbox-api.polar.sh/v1"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
