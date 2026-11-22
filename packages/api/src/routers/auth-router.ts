import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../index";
import { user } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import { getMemberRole, isOrgAdmin } from "../lib/membership";
import { z } from "zod";
import { db } from "@padyna/db";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  // Only an owner or admin of the active organization can change the role of a member of that
  // same organization.
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganization as string | null | undefined;
      if (!organizationId || !isOrgAdmin(ctx.memberRole)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change member roles" });
      }
      if (!(await getMemberRole(input.userId, organizationId))) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }
      await db.update(user).set({ role: input.role }).where(eq(user.id, input.userId));
      return { success: true };
    }),
});
