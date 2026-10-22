import { createLiveChatRoutes } from "./live-chat-ws";
import { liveChatService } from "./live-chat-service";

export const liveChatRoutes = createLiveChatRoutes(liveChatService);
