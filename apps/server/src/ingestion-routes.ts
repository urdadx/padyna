import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ingestFiles } from "./ingestion/file/ingest-files";
import { ingestLink, runMapWebsite } from "./ingestion/scrape";
import {
  ingestCrawl,
  checkCrawlStatus,
  processCompletedCrawl,
  cancelCrawl,
} from "./ingestion/crawl";
import { ingestQa, updateQa } from "./ingestion/qa";
import { ingestText, updateText } from "./ingestion/text";
import { authMiddleware } from "./middlewares/auth-middleware";
import { createRateLimitMiddleware } from "./lib/ratelimiter";

type Variables = {
  user: any;
  session: any;
};

export const ingestionRoutes = new Hono<{ Variables: Variables }>();

ingestionRoutes.use(authMiddleware);

// Limits that match the dashboard (20 MB per file) and keep one organization from exhausting
// memory, Firecrawl credits or embedding spend for everyone.
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;
const MAX_CRAWL_PAGES = 200;
const MAX_CRAWL_INCLUDE_PATHS = 20;
const CRAWL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

ingestionRoutes.use(
  "*",
  bodyLimit({
    maxSize: MAX_FILES_PER_UPLOAD * MAX_FILE_BYTES,
    onError: (c) => c.json({ message: "The upload is too large." }, 413),
  }),
);

const organizationKey = (c: { get: (key: "session") => any }) =>
  String(c.get("session")?.activeOrganization ?? "none");

const ingestionRateLimit = createRateLimitMiddleware({
  namespace: "ingestion-write",
  maxRequests: 60,
  windowSeconds: 10 * 60,
  resolveIdentifier: organizationKey,
});

const crawlRateLimit = createRateLimitMiddleware({
  namespace: "ingestion-crawl",
  maxRequests: 10,
  windowSeconds: 10 * 60,
  resolveIdentifier: organizationKey,
});

ingestionRoutes.on(["POST", "PUT"], "*", ingestionRateLimit);
ingestionRoutes.post("/crawl", crawlRateLimit);
ingestionRoutes.post("/map", crawlRateLimit);

ingestionRoutes.post("/files", async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  const formData = await c.req.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return c.json(
      {
        message: "No files were provided.",
      },
      400,
    );
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return c.json({ message: `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.` }, 400);
  }

  if (files.some((file) => file.size > MAX_FILE_BYTES)) {
    return c.json({ message: "Each file must be 20 MB or smaller." }, 413);
  }

  const ingestion = await ingestFiles({
    files,
    chatbotId: activeChatbot,
    organizationId: activeOrganization,
  });

  return c.json(ingestion);
});

ingestionRoutes.post("/scrape", async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  const body = await c.req.json();
  const url = body.url;

  if (!url) {
    return c.json(
      {
        message: "No URL provided.",
      },
      400,
    );
  }

  try {
    const result = await ingestLink({
      url,
      chatbotId: activeChatbot,
      organizationId: activeOrganization,
    });
    return c.json(result);
  } catch (error) {
    console.error("Ingestion error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to ingest link.",
      },
      500,
    );
  }
});

ingestionRoutes.post("/map", async (c) => {
  const body = await c.req.json();
  const { url } = body;

  if (!url) {
    return c.json(
      {
        message: "No URL provided.",
      },
      400,
    );
  }

  try {
    const links = await runMapWebsite(url);
    return c.json({ links });
  } catch (error) {
    console.error("Mapping error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to map website.",
      },
      500,
    );
  }
});

ingestionRoutes.post("/crawl", async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  const body = await c.req.json();
  const { url, limit, includePaths, crawlEntireDomain } = body;

  if (!url) {
    return c.json(
      {
        message: "No URL provided.",
      },
      400,
    );
  }

  try {
    const result = await ingestCrawl({
      url,
      chatbotId: activeChatbot,
      organizationId: activeOrganization,
      limit: Math.min(
        Math.max(1, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 100),
        MAX_CRAWL_PAGES,
      ),
      includePaths: Array.isArray(includePaths)
        ? includePaths
            .filter((path): path is string => typeof path === "string")
            .slice(0, MAX_CRAWL_INCLUDE_PATHS)
        : undefined,
      crawlEntireDomain: crawlEntireDomain === true,
    });
    return c.json(result);
  } catch (error) {
    console.error("Crawl error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to start crawl.",
      },
      500,
    );
  }
});

ingestionRoutes.get("/crawl/:id", async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  if (!activeChatbot || !activeOrganization) {
    return c.json(
      {
        message: "No active chatbot or organization.",
      },
      400,
    );
  }

  const crawlId = c.req.param("id");

  // Firecrawl crawl ids are UUIDs; anything else must not reach the Firecrawl URL.
  if (crawlId && !CRAWL_ID_PATTERN.test(crawlId)) {
    return c.json({ message: "Invalid crawl ID." }, 400);
  }

  if (!crawlId) {
    return c.json(
      {
        message: "No crawl ID provided.",
      },
      400,
    );
  }

  try {
    const result = await checkCrawlStatus(crawlId);

    if (result.status === "completed") {
      const processed = await processCompletedCrawl(crawlId, activeChatbot, activeOrganization);
      return c.json({
        ...result,
        processed,
      });
    }

    return c.json(result);
  } catch (error) {
    console.error("Crawl status error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to get crawl status.",
      },
      500,
    );
  }
});

ingestionRoutes.delete("/crawl/:id", async (c) => {
  const crawlId = c.req.param("id");

  // Firecrawl crawl ids are UUIDs; anything else must not reach the Firecrawl URL.
  if (crawlId && !CRAWL_ID_PATTERN.test(crawlId)) {
    return c.json({ message: "Invalid crawl ID." }, 400);
  }

  if (!crawlId) {
    return c.json(
      {
        message: "No crawl ID provided.",
      },
      400,
    );
  }

  try {
    const result = await cancelCrawl(crawlId);
    return c.json(result);
  } catch (error) {
    console.error("Crawl cancel error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to cancel crawl.",
      },
      500,
    );
  }
});

ingestionRoutes.post("/qa", async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  const body = await c.req.json();
  const { question, answer } = body;

  if (!question || !answer) {
    return c.json(
      {
        message: "Question and answer are required.",
      },
      400,
    );
  }

  try {
    const result = await ingestQa({
      question,
      answer,
      chatbotId: activeChatbot,
      organizationId: activeOrganization,
    });
    return c.json(result);
  } catch (error) {
    console.error("Q&A ingestion error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to ingest Q&A.",
      },
      500,
    );
  }
});

ingestionRoutes.post("/text", async (c) => {
  const session = c.get("session");
  const activeChatbot = session.activeChatbot;
  const activeOrganization = session.activeOrganization;

  const body = await c.req.json();
  const { content, title } = body;

  if (!content || !content.trim()) {
    return c.json(
      {
        message: "Content is required.",
      },
      400,
    );
  }

  try {
    const result = await ingestText({
      content,
      title,
      chatbotId: activeChatbot,
      organizationId: activeOrganization,
    });
    return c.json(result);
  } catch (error) {
    console.error("Text ingestion error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to ingest text.",
      },
      500,
    );
  }
});

ingestionRoutes.put("/qa/:id", async (c) => {
  const session = c.get("session");
  const id = c.req.param("id");

  if (!id) {
    return c.json(
      {
        message: "ID is required.",
      },
      400,
    );
  }

  const body = await c.req.json();
  const { question, answer } = body;

  if (!question || !answer) {
    return c.json(
      {
        message: "Question and answer are required.",
      },
      400,
    );
  }

  try {
    const result = await updateQa({
      id,
      question,
      answer,
      chatbotId: session.activeChatbot,
      organizationId: session.activeOrganization,
    });
    return c.json(result);
  } catch (error) {
    console.error("Q&A update error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to update Q&A.",
      },
      500,
    );
  }
});

ingestionRoutes.put("/text/:id", async (c) => {
  const session = c.get("session");
  const id = c.req.param("id");

  if (!id) {
    return c.json(
      {
        message: "ID is required.",
      },
      400,
    );
  }

  const body = await c.req.json();
  const { content, title } = body;

  if (!content || !content.trim()) {
    return c.json(
      {
        message: "Content is required.",
      },
      400,
    );
  }

  try {
    const result = await updateText({
      id,
      content,
      title,
      chatbotId: session.activeChatbot,
      organizationId: session.activeOrganization,
    });
    return c.json(result);
  } catch (error) {
    console.error("Text update error:", error);
    return c.json(
      {
        message: error instanceof Error ? error.message : "Failed to update text.",
      },
      500,
    );
  }
});
