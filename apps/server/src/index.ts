import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@padyna/api/context";
import { appRouter } from "@padyna/api/routers/index";
import { auth } from "@padyna/auth";
import { env } from "@padyna/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ingestionRoutes } from "./ingestion-routes";
import { chatRoutes } from "./chat";
import { widgetRoutes } from "./widget";
import { analyticsStreamRoutes } from "./analytics/stream";
import { endSessionRoute } from "./analytics/end-session";
import { polarWebhook } from "./payments/webhook";
import { checkout } from "./payments/checkout";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/ingestion", ingestionRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/widget", widgetRoutes);
app.route("/api/analytics/stream", analyticsStreamRoutes);
app.route("/api/analytics/session-end", endSessionRoute);
app.route("/api/", polarWebhook);
app.route("/api/", checkout);

app.use("/api/trpc/*", async (c, next) => {
  const accept = c.req.header("trpc-accept");
  if (accept === "subscription") {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext: () => createContext({ context: c }),
    });
    if (!response.body) {
      return c.text("No response body", { status: 500 });
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
  return next();
});

app.use(
  "/api/trpc/*",
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
