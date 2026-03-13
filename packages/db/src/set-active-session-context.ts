import { eq } from "drizzle-orm";
import { db } from ".";
import { session } from "./schema";

export async function setActiveSessionContext(
  userId: string,
  context: {
    activeOrganization: string | null;
    activeChatbot: string | null;
  },
) {
  await db
    .update(session)
    .set({
      activeOrganization: context.activeOrganization,
      activeChatbot: context.activeChatbot,
      updatedAt: new Date(),
    })
    .where(eq(session.userId, userId));
}
