import { auth } from "@padyna/auth";
import { getMemberRole } from "@padyna/api/lib/membership";
import { createMiddleware } from "hono/factory";

export const authMiddleware = createMiddleware<{
  Variables: {
    user: any;
    session: any;
    memberRole: string | null;
  };
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.session || !session.user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // The session's active organization is only a pointer: check the user is still a member,
  // so someone removed from the team loses access straight away.
  const activeOrganization = (session.session as { activeOrganization?: string | null }).activeOrganization;
  const memberRole = activeOrganization ? await getMemberRole(session.user.id, activeOrganization) : null;
  if (activeOrganization && !memberRole) {
    return c.json({ message: "You are no longer a member of this organization" }, 403);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  c.set("memberRole", memberRole);
  await next();
});
