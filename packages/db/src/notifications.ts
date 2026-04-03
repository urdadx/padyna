import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from ".";
import { member, notification } from "./schema";
import type { NotificationEntityType, NotificationEventType } from "./schema/notification";

function isMissingNotificationTableError(error: unknown): boolean {
  const maybeError = error as {
    message?: string;
    cause?: {
      code?: string;
      message?: string;
    };
  };

  const code = maybeError?.cause?.code;
  const message = `${maybeError?.message ?? ""} ${maybeError?.cause?.message ?? ""}`;

  return code === "42P01" || /relation\s+"notification"\s+does not exist/i.test(message);
}

type NotificationRecipientInput = {
  organizationId: string;
  chatbotId?: string | null;
  recipientUserIds?: string[];
  actorUserId?: string | null;
  eventType: NotificationEventType;
  entityType?: NotificationEntityType;
  entityId?: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

async function resolveOrganizationMemberIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  return rows.map((row) => row.userId);
}

export async function createNotifications(input: NotificationRecipientInput) {
  const recipientUserIds =
    input.recipientUserIds && input.recipientUserIds.length > 0
      ? [...new Set(input.recipientUserIds)]
      : await resolveOrganizationMemberIds(input.organizationId);

  if (recipientUserIds.length === 0) {
    return [];
  }

  const rows = recipientUserIds.map((recipientUserId) => ({
    organizationId: input.organizationId,
    chatbotId: input.chatbotId ?? null,
    recipientUserId,
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
    dedupeKey: input.dedupeKey,
  }));

  try {
    return await db
      .insert(notification)
      .values(rows)
      .onConflictDoNothing()
      .returning({
        id: notification.id,
        recipientUserId: notification.recipientUserId,
      });
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function createOrganizationNotification(input: {
  organizationId: string;
  chatbotId?: string | null;
  actorUserId?: string | null;
  eventType: NotificationEventType;
  entityType?: NotificationEntityType;
  entityId?: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}) {
  return createNotifications({
    organizationId: input.organizationId,
    chatbotId: input.chatbotId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
    dedupeKey: input.dedupeKey,
  });
}

export async function createSingleUserNotification(input: {
  organizationId: string;
  recipientUserId: string;
  chatbotId?: string | null;
  actorUserId?: string | null;
  eventType: NotificationEventType;
  entityType?: NotificationEntityType;
  entityId?: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}) {
  return createNotifications({
    organizationId: input.organizationId,
    recipientUserIds: [input.recipientUserId],
    chatbotId: input.chatbotId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
    dedupeKey: input.dedupeKey,
  });
}

export async function getNotificationsForUser(input: {
  userId: string;
  organizationId: string;
  limit: number;
  cursor?: string;
  unreadOnly?: boolean;
}) {
  let rows: typeof notification.$inferSelect[] = [];

  try {
    rows = await db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.organizationId, input.organizationId),
          eq(notification.recipientUserId, input.userId),
          input.unreadOnly ? eq(notification.isRead, false) : undefined,
          input.cursor ? sql`${notification.createdAt} < ${new Date(input.cursor)}` : undefined,
        ),
      )
      .orderBy(desc(notification.createdAt))
      .limit(input.limit + 1);
  } catch (error) {
    if (!isMissingNotificationTableError(error)) {
      throw error;
    }
  }

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const nextCursor = hasMore ? items.at(-1)?.createdAt?.toISOString() : undefined;

  return {
    items,
    hasMore,
    nextCursor,
  };
}

export async function getUnreadCountForUser(input: { userId: string; organizationId: string }) {
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notification)
      .where(
        and(
          eq(notification.organizationId, input.organizationId),
          eq(notification.recipientUserId, input.userId),
          eq(notification.isRead, false),
        ),
      );

    return result?.count ?? 0;
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      return 0;
    }

    throw error;
  }
}

export async function markNotificationsRead(input: {
  userId: string;
  organizationId: string;
  ids: string[];
}) {
  if (input.ids.length === 0) {
    return [];
  }

  try {
    return await db
      .delete(notification)
      .where(
        and(
          eq(notification.organizationId, input.organizationId),
          eq(notification.recipientUserId, input.userId),
          inArray(notification.id, input.ids),
        ),
      )
      .returning({ id: notification.id });
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function markAllNotificationsRead(input: { userId: string; organizationId: string }) {
  try {
    return await db
      .delete(notification)
      .where(
        and(
          eq(notification.organizationId, input.organizationId),
          eq(notification.recipientUserId, input.userId),
        ),
      )
      .returning({ id: notification.id });
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      return [];
    }

    throw error;
  }
}
