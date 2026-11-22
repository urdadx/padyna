import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { getMemberRole } from "./lib/membership";

export const t = initTRPC.context<Context>().create({
  sse: {
    ping: {
      enabled: true,
      intervalMs: 5_000,
    },
  },
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }

  // The session's active organization is only a pointer: check the user is still a member,
  // so someone removed from the team loses access straight away.
  const activeOrganization = ctx.session.session.activeOrganization as string | null | undefined;
  const memberRole = activeOrganization
    ? await getMemberRole(ctx.session.user.id, activeOrganization)
    : null;
  if (activeOrganization && !memberRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are no longer a member of this organization" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      memberRole,
    },
  });
});
