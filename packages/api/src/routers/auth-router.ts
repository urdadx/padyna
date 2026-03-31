import { publicProcedure, router } from "../index";
import { user } from "@padyna/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@padyna/db";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  updateUserRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = ctx.session?.user?.role;

      if (role !== "admin") {
        throw new Error("Unauthorized");
      }
      await db.update(user).set({ role: input.role }).where(eq(user.id, input.userId));
      return { success: true };
    }),
});
