import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq } from "drizzle-orm";
import { member } from "@padyna/db/schema/organization";
import { user } from "@padyna/db/schema/auth";

export const organizationRouter = router({
  getMembers: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const members = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));

    return members;
  }),
});
