import type { PadynaCallable } from "./types";

declare global {
  interface Window {
    Padyna: PadynaCallable;
  }
}

export {};
