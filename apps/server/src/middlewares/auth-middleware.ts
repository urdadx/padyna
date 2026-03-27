import { auth } from "@padyna/auth";
import { createMiddleware } from "hono/factory";

export const authMiddleware = createMiddleware<{
  Variables: {
    user: any;
    session: any;
  };
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.session || !session.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
