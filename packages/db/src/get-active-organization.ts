import { and, desc, eq } from "drizzle-orm";
import { db } from ".";
import { member, session } from "./schema";

export async function getActiveOrganization(userId: string) {
  const [lastSession] = await db
    .select({ activeOrganization: session.activeOrganization })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.updatedAt))
    .limit(1);

  if (lastSession?.activeOrganization) {
    const [memberRecord] = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, lastSession.activeOrganization)),
      )
      .limit(1);

    if (memberRecord) {
      return memberRecord.organizationId;
    }
  }

  const [fallbackMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(desc(member.createdAt))
    .limit(1);

  return fallbackMembership?.organizationId ?? null;
}
