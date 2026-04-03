import { protectedProcedure, publicProcedure, router } from "../index";
import { agentsettingsRouter } from "./agentsettings-router";
import { analyticsRouter } from "./analytics-router";
import { conversationsRouter } from "./conversations-router";
import { datasourceRouter } from "./datasource-router";
import { metricsRouter } from "./metrics-router";
import { subscriptionRouter } from "./subscription-router";
import { voteRouter } from "./vote-router";
import { authRouter } from "./auth-router";
import { organizationRouter } from "./organization-router";
import { notificationsRouter } from "./notifications-router";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  agentsettings: agentsettingsRouter,
  analytics: analyticsRouter,
  conversations: conversationsRouter,
  datasource: datasourceRouter,
  metrics: metricsRouter,
  subscription: subscriptionRouter,
  vote: voteRouter,
  auth: authRouter,
  organization: organizationRouter,
  notifications: notificationsRouter,
});
export type AppRouter = typeof appRouter;
