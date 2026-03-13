import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@padyna/api/context";
import { appRouter } from "@padyna/api/routers/index";
import { auth } from "@padyna/auth";
import { env } from "@padyna/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ingestFiles } from "./ingestion/file/ingest-files";
import { ingestLink, runMapWebsite } from "./ingestion/link";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.post("/api/ingestion/files", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.session || !session.user) {
    return c.json(
      {
        message: "Unauthorized",
      },
      401,
    );
  }

  const activeChatbot = session.session.activeChatbot;
  const activeOrganization = session.session.activeOrganization;

  if (!activeChatbot || !activeOrganization) {
    return c.json(
      {
        message: "No active chatbot or organization selected.",
      },
      400,
    );
  }

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

app.post("/api/ingestion/link", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.session || !session.user) {
    return c.json(
      {
        message: "Unauthorized",
      },
      401,
    );
  }

  const activeChatbot = session.session.activeChatbot;
  const activeOrganization = session.session.activeOrganization;

  if (!activeChatbot || !activeOrganization) {
    return c.json(
      {
        message: "No active chatbot or organization selected.",
      },
      400,
    );
  }

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

app.post("/api/ingestion/map", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.session || !session.user) {
    return c.json(
      {
        message: "Unauthorized",
      },
      401,
    );
  }

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

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
