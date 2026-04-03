import { EventEmitter } from "events";

export interface AnalyticsEvent {
  chatbotId: string;
  action: "widget-open" | "widget-close" | "session-create" | "session-end" | "presence-update";
}

class AnalyticsEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }
}

export const analyticsEvents = new AnalyticsEventEmitter();
