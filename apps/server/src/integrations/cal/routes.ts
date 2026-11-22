import { env } from "@padyna/env/server";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { calActionConfigSchema, parseCalUrl } from "../../actions/schema";
import { findEnabledPublicAction, publicActionRateLimit } from "../../lib/public-action-guard";

const CAL_API_BASE_URL = "https://api.cal.com/v2/";
const CAL_SLOTS_API_VERSION = "2024-09-04";
const CAL_BOOKINGS_API_VERSION = "2024-08-13";
const CAL_API_TIMEOUT_MS = 10_000;

type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 504;

type CalSlotEntry = string | { start?: string };
type CalSlotsResponse = {
  data?: Record<string, CalSlotEntry[]>;
};

type CalBookingResponse = Record<string, unknown> & {
  data?: {
    uid?: string;
    status?: string;
  };
};

const slotsQuerySchema = z
  .object({
    actionId: z.uuid("actionId is required"),
    username: z.string().trim().min(1, "username is required"),
    eventSlug: z.string().trim().min(1, "eventSlug is required"),
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
  })
  .superRefine(({ startTime, endTime }, ctx) => {
    if (new Date(endTime) <= new Date(startTime)) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
  });

const bookingBodySchema = z
  .object({
    actionId: z.uuid("actionId is required"),
    username: z.string().trim().min(1, "username is required"),
    eventSlug: z.string().trim().min(1, "eventSlug is required"),
    start: z.iso.datetime({ offset: true }),
    attendee: z
      .object({
        name: z.string().trim().min(1, "attendee.name is required").optional(),
        email: z.email("attendee.email must be a valid email").optional(),
        timeZone: z.string().trim().min(1).optional(),
      })
      .optional(),
    attendeeName: z.string().trim().min(1, "attendeeName is required").optional(),
    attendeeEmail: z.email("attendeeEmail must be a valid email").optional(),
    attendeeTimeZone: z.string().trim().min(1).optional(),
    notes: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.attendee?.name && !value.attendeeName) {
      ctx.addIssue({
        code: "custom",
        path: ["attendeeName"],
        message: "attendee name is required",
      });
    }

    if (!value.attendee?.email && !value.attendeeEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["attendeeEmail"],
        message: "attendee email is required",
      });
    }

    const attendeeTimeZone = value.attendee?.timeZone ?? value.attendeeTimeZone ?? "UTC";
    if (!isValidTimeZone(attendeeTimeZone)) {
      ctx.addIssue({
        code: "custom",
        path: value.attendee?.timeZone ? ["attendee", "timeZone"] : ["attendeeTimeZone"],
        message: "time zone must be a valid IANA time zone",
      });
    }
  });

function isValidTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

function getRequestId(c: Context) {
  return c.req.header("x-request-id") ?? crypto.randomUUID();
}

function logCalEvent(message: string, metadata: Record<string, unknown>) {
  console.info(`[cal] ${message}`, metadata);
}

function getCalErrorStatusCode(statusCode?: number): ErrorStatusCode {
  return statusCode === 400
    ? 400
    : statusCode === 401
      ? 401
      : statusCode === 403
        ? 403
        : statusCode === 404
          ? 404
          : statusCode === 409
            ? 409
            : statusCode === 422
              ? 422
              : statusCode === 429
                ? 429
                : statusCode === 408
                  ? 504
                  : 502;
}

function formatValidationErrors(error: z.ZodError) {
  return error.issues.reduce<Record<string, string[]>>((fields, issue) => {
    const field = issue.path.join(".") || "_root";
    fields[field] ??= [];
    fields[field].push(issue.message);
    return fields;
  }, {});
}

async function readCalErrorDetails(response: Response) {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function callCalApi({
  path,
  calApiKey,
  apiVersion,
  method = "GET",
  searchParams,
  body,
}: {
  path: string;
  calApiKey: string;
  apiVersion: string;
  method?: "GET" | "POST";
  searchParams?: Record<string, string>;
  body?: unknown;
}) {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, CAL_API_BASE_URL);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${calApiKey}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      "cal-api-version": apiVersion,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(CAL_API_TIMEOUT_MS),
  });
}

async function respondWithCalApiError(
  c: Context,
  response: Response,
  message: string,
  requestId: string,
) {
  const details = await readCalErrorDetails(response);
  logCalEvent("upstream request failed", {
    requestId,
    status: response.status,
    message,
  });

  return c.json(
    {
      error: message,
      details,
    },
    getCalErrorStatusCode(response.status),
  );
}

function respondWithValidationError(c: Context, error: z.ZodError) {
  return c.json(
    {
      error: "Invalid request",
      fields: formatValidationErrors(error),
    },
    400,
  );
}

function respondWithUnhandledError(c: Context, error: unknown, requestId: string, message: string) {
  if (error instanceof Error && error.name === "TimeoutError") {
    logCalEvent("request timed out", {
      requestId,
      message,
    });
    return c.json({ error: "Cal.com request timed out" }, 504);
  }

  console.error(message, { requestId, error });
  return c.json({ error: "Internal server error" }, 500);
}

/**
 * The Cal.com event a request may use: the one configured on an enabled Cal action. Requests
 * carry the action id they came from, so Padyna's Cal.com key is only ever used for events a
 * tenant set up, not for any username a caller names.
 */
async function resolveCalEvent(actionId: string, username: string, eventSlug: string) {
  const action = await findEnabledPublicAction(actionId, "cal");
  if (!action) return null;
  const config = calActionConfigSchema.safeParse(action.config);
  const event = config.success ? parseCalUrl(config.data.calUrl) : null;
  if (!event || event.username !== username || event.eventSlug !== eventSlug) return null;
  return event;
}

export const calRoutes = new Hono();

calRoutes.get("/slots", async (c) => {
  const requestId = getRequestId(c);
  const parsedQuery = slotsQuerySchema.safeParse(c.req.query());

  if (!parsedQuery.success) {
    return respondWithValidationError(c, parsedQuery.error);
  }

  if (
    !(await resolveCalEvent(
      parsedQuery.data.actionId,
      parsedQuery.data.username,
      parsedQuery.data.eventSlug,
    ))
  ) {
    return c.json({ error: "Appointment booking isn't available" }, 404);
  }

  const calApiKey = env.CAL_API_KEY;
  if (!calApiKey) {
    return c.json({ error: "Cal.com API key not configured" }, 500);
  }

  try {
    const response = await callCalApi({
      path: "/slots",
      calApiKey,
      apiVersion: CAL_SLOTS_API_VERSION,
      searchParams: {
        username: parsedQuery.data.username,
        eventTypeSlug: parsedQuery.data.eventSlug,
        start: parsedQuery.data.startTime,
        end: parsedQuery.data.endTime,
      },
    });

    if (!response.ok) {
      return await respondWithCalApiError(
        c,
        response,
        "Failed to fetch slots from Cal.com",
        requestId,
      );
    }

    const data = (await response.json()) as CalSlotsResponse;
    const transformedSlots: { time: string }[] = [];

    for (const times of Object.values(data.data ?? {})) {
      for (const slot of times) {
        if (typeof slot === "string") {
          transformedSlots.push({ time: slot });
          continue;
        }

        if (slot.start) {
          transformedSlots.push({ time: slot.start });
        }
      }
    }

    logCalEvent("slots fetched", {
      requestId,
      username: parsedQuery.data.username,
      eventSlug: parsedQuery.data.eventSlug,
      slotCount: transformedSlots.length,
    });

    return c.json({ slots: transformedSlots });
  } catch (error) {
    return respondWithUnhandledError(c, error, requestId, "Error fetching Cal.com slots");
  }
});

calRoutes.post("/booking", publicActionRateLimit, async (c) => {
  const requestId = getRequestId(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsedBody = bookingBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return respondWithValidationError(c, parsedBody.error);
  }

  if (
    !(await resolveCalEvent(
      parsedBody.data.actionId,
      parsedBody.data.username,
      parsedBody.data.eventSlug,
    ))
  ) {
    return c.json({ error: "Appointment booking isn't available" }, 404);
  }

  const calApiKey = env.CAL_API_KEY;
  if (!calApiKey) {
    return c.json({ error: "Cal.com API key not configured" }, 500);
  }

  const attendeeName = parsedBody.data.attendee?.name ?? parsedBody.data.attendeeName;
  const attendeeEmail = parsedBody.data.attendee?.email ?? parsedBody.data.attendeeEmail;
  const attendeeTimeZone =
    parsedBody.data.attendee?.timeZone ?? parsedBody.data.attendeeTimeZone ?? "UTC";

  const bookingPayload = {
    username: parsedBody.data.username,
    eventTypeSlug: parsedBody.data.eventSlug,
    start: parsedBody.data.start,
    attendee: {
      name: attendeeName,
      email: attendeeEmail,
      timeZone: attendeeTimeZone,
    },
    ...(parsedBody.data.notes ? { metadata: { notes: parsedBody.data.notes } } : {}),
  };

  logCalEvent("creating booking", {
    requestId,
    username: parsedBody.data.username,
    eventSlug: parsedBody.data.eventSlug,
    start: parsedBody.data.start,
    attendeeTimeZone,
  });

  try {
    const response = await callCalApi({
      path: "/bookings",
      calApiKey,
      apiVersion: CAL_BOOKINGS_API_VERSION,
      method: "POST",
      body: bookingPayload,
    });

    if (!response.ok) {
      return await respondWithCalApiError(c, response, "Failed to create booking", requestId);
    }

    const bookingData = (await response.json()) as CalBookingResponse;
    logCalEvent("booking created", {
      requestId,
      bookingUid: bookingData.data?.uid ?? null,
      bookingStatus: bookingData.data?.status ?? null,
    });

    if (bookingData.data?.uid && bookingData.data?.status === "PENDING") {
      const confirmResponse = await callCalApi({
        path: `/bookings/${bookingData.data.uid}/confirm`,
        calApiKey,
        apiVersion: CAL_BOOKINGS_API_VERSION,
        method: "POST",
      });

      if (confirmResponse.ok) {
        const confirmedData = (await confirmResponse.json()) as Record<string, unknown>;
        logCalEvent("booking confirmed", {
          requestId,
          bookingUid: bookingData.data.uid,
        });
        return c.json(confirmedData);
      }

      logCalEvent("booking confirmation failed", {
        requestId,
        bookingUid: bookingData.data.uid,
        status: confirmResponse.status,
      });

      return c.json({
        ...bookingData,
        confirmationFailed: true,
      });
    }

    return c.json(bookingData);
  } catch (error) {
    return respondWithUnhandledError(c, error, requestId, "Error creating Cal.com booking");
  }
});
