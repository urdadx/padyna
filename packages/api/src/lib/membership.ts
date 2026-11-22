import { db } from "@padyna/db";
import { member } from "@padyna/db/schema/organization";
import { and, eq } from "drizzle-orm";

/** The user's role in the organization ("owner", "admin" or "member"), or null if they aren't a member. */
export async function getMemberRole(userId: string, organizationId: string) {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  return row?.role ?? null;
}

/** Owners and admins of the organization. */
export function isOrgAdmin(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}
