import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
  getNotificationsForUser,
  getUnreadCountForUser,
  markAllNotificationsRead,
  markNotificationsRead,
} from "@padyna/db/notifications";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          cursor: z.iso.datetime().optional(),
          unreadOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      return getNotificationsForUser({
        userId: ctx.session.user.id,
        organizationId,
        limit: input?.limit ?? 20,
        cursor: input?.cursor,
        unreadOnly: input?.unreadOnly,
      });
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      return 0;
    }

    return getUnreadCountForUser({
      userId: ctx.session.user.id,
      organizationId,
    });
  }),

  markRead: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganization;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const updated = await markNotificationsRead({
        userId: ctx.session.user.id,
        organizationId,
        ids: input.ids,
      });

      return {
        count: updated.length,
      };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganization;
    if (!organizationId) {
      throw new Error("No active organization");
    }

    const updated = await markAllNotificationsRead({
      userId: ctx.session.user.id,
      organizationId,
    });

    return {
      count: updated.length,
    };
  }),
});
