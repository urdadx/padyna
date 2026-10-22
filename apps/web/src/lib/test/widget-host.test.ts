import { describe, expect, test } from "bun:test";

import { createWidgetHostChannel } from "../widget-host";

/** A "message" event; Bun's MessageEvent only accepts a MessagePort as source. */
function messageEvent(data: unknown, source: unknown) {
  return Object.assign(new Event("message"), { data, source });
}

/** A window inside an iframe: `parent` is the embedding page. */
function createFrame() {
  const target = new EventTarget() as EventTarget & { parent: unknown };
  const parent = {};
  target.parent = parent;
  const post = (data: unknown, source: unknown = parent) =>
    target.dispatchEvent(messageEvent(data, source));
  return { target, post };
}

describe("widget host channel", () => {
  test("remembers an open that arrived before anyone subscribed", () => {
    const { target, post } = createFrame();
    const channel = createWidgetHostChannel(target as any);

    post({ type: "padyna:widget_open" });

    // The session hook subscribes only after the widget config loads.
    expect(channel.isOpen()).toBe(true);
  });

  test("tracks closes and page unloads, and notifies subscribers", () => {
    const { target, post } = createFrame();
    const channel = createWidgetHostChannel(target as any);
    const seen: string[] = [];
    const unsubscribe = channel.subscribe((type) => seen.push(type));

    post({ type: "padyna:widget_open" });
    post({ type: "padyna:widget_close" });
    expect(channel.isOpen()).toBe(false);
    post({ type: "padyna:widget_open" });
    post({ type: "parent-page-unload" });
    unsubscribe();
    post({ type: "padyna:widget_open" });

    expect(seen).toEqual([
      "padyna:widget_open",
      "padyna:widget_close",
      "padyna:widget_open",
      "parent-page-unload",
    ]);
  });

  test("ignores messages that aren't from the embedding page or aren't ours", () => {
    const { target, post } = createFrame();
    const channel = createWidgetHostChannel(target as any);

    post({ type: "padyna:widget_open" }, {}); // another frame
    post({ type: "something_else" });
    post("padyna:widget_open");
    post(null);

    expect(channel.isOpen()).toBe(false);
  });

  test("does nothing when not embedded", () => {
    const target = new EventTarget() as EventTarget & { parent: unknown };
    target.parent = target; // a top-level window is its own parent
    const channel = createWidgetHostChannel(target as any);

    target.dispatchEvent(messageEvent({ type: "padyna:widget_open" }, target));

    expect(channel.isOpen()).toBe(false);
  });
});
