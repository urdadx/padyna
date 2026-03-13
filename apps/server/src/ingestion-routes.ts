import { Hono } from "hono";
import { ingestFiles } from "./ingestion/file/ingest-files";
import { ingestLink, runMapWebsite } from "./ingestion/scrape";
import { ingestCrawl, checkCrawlStatus, processCompletedCrawl } from "./ingestion/crawl";
import { authMiddleware } from "./middlewares/authMiddleware";

type Variables = {
  user: any;
  session: any;
};

export const ingestionRoutes = new Hono<{ Variables: Variables }>();

ingestionRoutes.use(authMiddleware);

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
      limit,
      includePaths,
      crawlEntireDomain,
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

  const crawlId = c.req.param("id");

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
