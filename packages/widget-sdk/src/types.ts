export type PadynaInitOptions = {
  widgetId: string;
  serverUrl?: string;
  apiUrl?: string;
};

export type PadynaCommand = "init" | "open" | "close" | "destroy";

export type PadynaCallable = {
  (command: "init", options: PadynaInitOptions): void;
  (command: Exclude<PadynaCommand, "init">): void;
  q?: unknown[][];
};
