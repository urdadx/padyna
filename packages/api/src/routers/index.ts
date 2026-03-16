import { protectedProcedure, publicProcedure, router } from "../index";
import { datasourceRouter } from "./datasource-router";
import { agentsettingsRouter } from "./agentsettings-router";
import { conversationsRouter } from "./conversations-router";

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
  datasource: datasourceRouter,
  agentsettings: agentsettingsRouter,
  conversations: conversationsRouter,
});
export type AppRouter = typeof appRouter;
