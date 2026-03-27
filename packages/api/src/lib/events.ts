import { EventEmitter } from "events";

export interface AnalyticsEvent {
  chatbotId: string;
  action: "widget-open" | "widget-close" | "session-create" | "session-end";
}

class AnalyticsEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(1000);
  }
}

export const analyticsEvents = new AnalyticsEventEmitter();