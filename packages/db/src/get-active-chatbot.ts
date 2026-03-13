import { eq, desc, and } from "drizzle-orm";
import { db } from ".";
import { chatbot, member, session } from "./schema";

export async function getActiveChatbot(userId: string, organizationId?: string | null) {
  const [lastSession] = await db
    .select({ activeChatbot: session.activeChatbot })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.updatedAt))
    .limit(1);

  if (lastSession?.activeChatbot) {
    const accessConditions = [eq(chatbot.id, lastSession.activeChatbot), eq(member.userId, userId)];

    if (organizationId) {
      accessConditions.push(eq(chatbot.organizationId, organizationId));
    }

    const [chatbotData] = await db
      .select({ id: chatbot.id })
      .from(chatbot)
      .innerJoin(member, eq(chatbot.organizationId, member.organizationId))
      .where(and(...accessConditions));

    if (chatbotData) {
      return chatbotData.id;
    }
  }

  const fallbackConditions = [eq(member.userId, userId)];

  if (organizationId) {
    fallbackConditions.push(eq(chatbot.organizationId, organizationId));
  }

  const [chatbotData] = await db
    .select({ id: chatbot.id })
    .from(chatbot)
    .innerJoin(member, eq(chatbot.organizationId, member.organizationId))
    .where(and(...fallbackConditions))
    .orderBy(desc(chatbot.updatedAt))
    .limit(1);

  return chatbotData?.id ?? null;
}
