import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_MONTHLY_STARTER_PLAN: z.string().optional(),
    VITE_YEARLY_STARTER_PLAN: z.string().optional(),
    VITE_MONTHLY_GROWTH_PLAN: z.string().optional(),
    VITE_YEARLY_GROWTH_PLAN: z.string().optional(),
    VITE_MONTHLY_PRO_PLAN: z.string().optional(),
    VITE_YEARLY_PRO_PLAN: z.string().optional(),
    VITE_EXTRA_CHATBOT_ADDON: z.string().optional(),
    VITE_EXTRA_MESSAGE_CREDITS_ADDON: z.string().optional(),
    VITE_REMOVE_BRANDING_ADDON: z.string().optional(),
    VITE_EXTRA_TEAM_MEMBER_ADDON: z.string().optional(),
    VITE_POLAR_ACCESS_TOKEN: z.string(),
    VITE_FRONTEND_ORIGIN: z.url().default("http://localhost:3001"),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
