import { endVisitorSession } from "@padyna/api/lib/analytics";
import { createEndSessionRoute } from "./end-session-route";

export const endSessionRoute = createEndSessionRoute(endVisitorSession);
