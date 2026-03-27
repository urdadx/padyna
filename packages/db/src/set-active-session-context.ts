import { eq, desc } from "drizzle-orm";
import { db } from ".";
import { session as sessionTable } from "./schema";

export async function setActiveSessionContext(
  userId: string,
  context: {
    activeOrganization: string | null;
    activeChatbot: string | null;
  },
) {
  const [activeSession] = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .orderBy(desc(sessionTable.updatedAt))
    .limit(1);

  if (!activeSession) {
    console.warn("No active session found for user:", userId);
    return;
  }

  await db
    .update(sessionTable)
    .set({
      activeOrganization: context.activeOrganization,
      activeChatbot: context.activeChatbot,
      updatedAt: new Date(),
    })
    .where(eq(sessionTable.token, activeSession.token));
}
