import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { db } from "@padyna/db";
import { eq, and, desc, inArray, sum } from "drizzle-orm";
import { datasources, datasourceChunks } from "@padyna/db/schema/index";

const timeRangeSchema = z.enum(["24h", "7d", "30d", "90d"]).default("24h");

const paginatedInput = z.object({
  timeRange: timeRangeSchema,
  limit: z.number().min(1).max(100).default(10),
});

export const datasourceRouter = router({
  getTotalSize: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      return 0;
    }

    const result = await db
      .select({
        totalSize: sum(datasources.sizeBytes),
      })
      .from(datasources)
      .where(eq(datasources.organizationId, organizationId));

    return Number(result[0]?.totalSize ?? 0);
  }),

  getSourceCounts: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;
    if (!organizationId || !chatbotId) {
      return { file: 0, text: 0, link: 0, qa: 0, notion: 0, google_drive: 0, all: 0 };
    }

    const result = await db
      .select({ sourceType: datasources.sourceType })
      .from(datasources)
      .where(
        and(eq(datasources.chatbotId, chatbotId), eq(datasources.organizationId, organizationId)),
      );

    return {
      file: result.filter((r) => r.sourceType === "file").length,
      text: result.filter((r) => r.sourceType === "text").length,
      link: result.filter((r) => r.sourceType === "link").length,
      qa: result.filter((r) => r.sourceType === "qa").length,
      notion: result.filter((r) => r.sourceType === "notion").length,
      google_drive: result.filter((r) => r.sourceType === "google_drive").length,
      all: result.length,
    };
  }),

  getMostReferenced: protectedProcedure.input(paginatedInput).query(async ({ ctx, input }) => {
    const organizationId = ctx.session.session.activeOrganization;
    const chatbotId = ctx.session.session.activeChatbot;

    if (!organizationId || !chatbotId) {
      return [];
    }

    const result = await db
      .select()
      .from(datasources)
      .where(
        and(eq(datasources.chatbotId, chatbotId), eq(datasources.organizationId, organizationId)),
      )
      .orderBy(desc(datasources.timesReferenced))
      .limit(input.limit);

    return result;
  }),

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

  deleteMany: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.uuid()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      if (input.ids.length === 0) {
        return { success: true };
      }

      const count = await db
        .select()
        .from(datasources)
        .where(
          and(eq(datasources.organizationId, organizationId), inArray(datasources.id, input.ids)),
        );

      if (count.length !== input.ids.length) {
        throw new Error("Some datasources not found or no permission");
      }

      await db.delete(datasourceChunks).where(inArray(datasourceChunks.datasourceId, input.ids));

      await db.delete(datasources).where(inArray(datasources.id, input.ids));

      return { success: true };
    }),
});
