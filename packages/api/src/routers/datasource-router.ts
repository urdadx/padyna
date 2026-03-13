import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, desc } from "drizzle-orm";
import { datasources, datasourceChunks } from "@padyna/db/schema/index";

export const datasourceRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const result = await db
      .select()
      .from(datasources)
      .where(
        // @ts-ignore
        and(eq(datasources.chatbotId, chatbotId), eq(datasources.organizationId, organizationId)),
      )
      .orderBy(desc(datasources.createdAt));

    return result;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        sourceName: z.string().optional(),
        question: z.string().optional(),
        answer: z.string().optional(),
        contentText: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const existing = await db
        .select()
        .from(datasources)
        .where(eq(datasources.id, input.id))
        .limit(1);

      const record = existing[0];
      if (!record || record.organizationId !== organizationId) {
        throw new Error("Datasource not found");
      }

      const [updated] = await db
        .update(datasources)
        .set({
          ...(input.sourceName && { sourceName: input.sourceName }),
          ...(input.question !== undefined && { question: input.question }),
          ...(input.answer !== undefined && { answer: input.answer }),
          ...(input.contentText !== undefined && { contentText: input.contentText }),
        })
        .where(eq(datasources.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const existing = await db
        .select()
        .from(datasources)
        .where(eq(datasources.id, input.id))
        .limit(1);

      const record = existing[0];
      if (!record || record.organizationId !== organizationId) {
        throw new Error("Datasource not found");
      }

      await db.delete(datasourceChunks).where(eq(datasourceChunks.datasourceId, input.id));

      await db.delete(datasources).where(eq(datasources.id, input.id));

      return { success: true };
    }),
});
