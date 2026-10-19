import type { PadynaCallable } from "./types";
import type { PadynaCommand, PadynaInitOptions } from "./types";

const ROOT_ID = "padyna-widget-root";
const BUTTON_ID = "padyna-widget-button";
const PANEL_ID = "padyna-widget-panel";
const IFRAME_ID = "padyna-widget-iframe";
const LOADER_ID = "padyna-widget-loader";
const BUBBLE_ID = "padyna-widget-launcher-bubble";
const BUBBLE_TEXT_ID = "padyna-widget-launcher-bubble-text";
const BUBBLE_CLOSE_ID = "padyna-widget-launcher-bubble-close";
const DEFAULT_LAUNCHER_MESSAGE = "Hey there👋, ask me anything";
const MIN_LOADER_VISIBLE_MS = 10;
const MOBILE_BREAKPOINT_PX = 640;

const WIDGET_CLOSED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10c-1.6 0-3.112-.376-4.452-1.044a1.63 1.63 0 0 0-1.149-.133l-2.226.596a1.3 1.3 0 0 1-1.591-1.592l.595-2.226a1.63 1.63 0 0 0-.134-1.148A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10M12 7.25a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75M8.75 10a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0zM16 9.25a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75" clip-rule="evenodd"/></svg>`;

const WIDGET_OPEN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>`;

const WIDGET_SPINNER_ICON = `<div style="width:22px;height:22px;border-radius:50%;border:2.5px solid #e5e7eb;border-top-color:#6b7280;animation:padyna-spin 0.75s linear infinite"></div>`;

const WIDGET_BUBBLE_CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>`;

type PadynaWidgetConfig = {
  primaryColor?: string;
  launcherMessage?: string;
};

type PadynaDom = {
  root: HTMLDivElement;
  button: HTMLButtonElement;
  panel: HTMLDivElement;
  iframe: HTMLIFrameElement;
  loader: HTMLDivElement;
  bubble: HTMLDivElement;
  bubbleText: HTMLSpanElement;
  bubbleClose: HTMLButtonElement;
};

type PadynaState = {
  isInitialized: boolean;
  isOpen: boolean;
  isVisible: boolean;
  initOptions: PadynaInitOptions | null;
  defaultServerUrl: string;
  dom: PadynaDom | null;
  onKeydown: ((event: KeyboardEvent) => void) | null;
  onMessage: ((event: MessageEvent) => void) | null;
  onResize: (() => void) | null;
  isIframeLoaded: boolean;
  isIframeBootstrapped: boolean;
  widgetUrl: string;
  widgetOrigin: string;
  onBeforeUnload: (() => void) | null;
  loaderShownAt: number;
  hideLoaderTimer: ReturnType<typeof setTimeout> | null;
  launcherMessage: string;
  isLauncherMessageDismissed: boolean;
};

function inferDefaultServerUrl() {
  if (typeof document === "undefined") {
    return "";
  }

  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript?.src) {
    return new URL(currentScript.src, window.location.href).origin;
  }

  const candidate = document.querySelector(
    'script[src*="/sdk.js"],script[src*="widget-sdk"]',
  ) as HTMLScriptElement | null;

  if (!candidate?.src) {
    return "";
  }

  return new URL(candidate.src, window.location.href).origin;
}

function normalizeServerUrl(serverUrl: string | undefined, fallback: string) {
  if (typeof serverUrl === "string" && serverUrl.trim().length > 0) {
    return serverUrl.replace(/\/$/, "");
  }

  return fallback;
}

function normalizeApiUrl(options: PadynaInitOptions, fallback: string) {
  if (typeof options.apiUrl === "string" && options.apiUrl.trim().length > 0) {
    return options.apiUrl.replace(/\/$/, "");
  }

  return normalizeServerUrl(options.serverUrl, fallback);
}

function buildWidgetUrl(options: PadynaInitOptions, defaultServerUrl: string) {
  const serverUrl = normalizeServerUrl(options.serverUrl, defaultServerUrl);
  if (!serverUrl) {
    return "";
  }

  const url = new URL("/widget", serverUrl);
  url.searchParams.set("widgetId", options.widgetId);
  // No hostOrigin here: the iframe reads its parent origin from the browser, not its URL.
  return url.toString();
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT_PX;
}

function getLauncherMessageStorageKey(widgetId: string) {
  return `padyna-launcher-message-dismissed:${widgetId}`;
}

function readLauncherMessageDismissed(widgetId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getLauncherMessageStorageKey(widgetId)) === "1";
  } catch {
    return false;
  }
}

function persistLauncherMessageDismissed(widgetId: string, dismissed: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (dismissed) {
      window.localStorage.setItem(getLauncherMessageStorageKey(widgetId), "1");
      return;
    }

    window.localStorage.removeItem(getLauncherMessageStorageKey(widgetId));
  } catch {}
}

function hasLauncherMessage() {
  return state.launcherMessage.trim().length > 0;
}

function syncLauncherBubble(dom: PadynaDom) {
  dom.bubbleText.textContent = state.launcherMessage;

  const shouldShow = !state.isOpen && !state.isLauncherMessageDismissed && hasLauncherMessage();
  dom.bubble.style.display = shouldShow ? "flex" : "none";
  dom.bubble.style.opacity = shouldShow ? "1" : "0";
  dom.bubble.style.transform = shouldShow ? "scale(1)" : "scale(0.96)";
  dom.bubble.style.pointerEvents = shouldShow ? "auto" : "none";
}

function applyLayoutState(dom: PadynaDom, isOpen: boolean) {
  const isMobileFullscreen = isOpen && isMobileViewport();

  dom.root.style.top = isMobileFullscreen ? "0" : "auto";
  dom.root.style.left = isMobileFullscreen ? "0" : "auto";
  dom.root.style.right = isMobileFullscreen ? "0" : "20px";
  dom.root.style.bottom = isMobileFullscreen ? "0" : "20px";
  dom.root.style.width = isMobileFullscreen ? "100vw" : "auto";
  dom.root.style.height = isMobileFullscreen ? "100dvh" : "auto";
  dom.root.style.alignItems = isMobileFullscreen ? "stretch" : "flex-end";
  if (isMobileFullscreen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  dom.panel.style.width = isMobileFullscreen ? "100vw" : "min(400px, calc(100vw - 24px))";
  dom.panel.style.height = isMobileFullscreen ? "100dvh" : "min(680px, calc(100vh - 96px))";
  dom.panel.style.maxHeight = isMobileFullscreen ? "100dvh" : "680px";
  dom.panel.style.marginBottom = isMobileFullscreen ? "0" : "12px";
  dom.panel.style.borderRadius = isMobileFullscreen ? "0" : "16px";
  dom.panel.style.transformOrigin = isMobileFullscreen ? "center center" : "bottom right";

  dom.button.style.display = isMobileFullscreen ? "none" : "grid";
}

function applyOpenState(dom: PadynaDom, isOpen: boolean) {
  applyLayoutState(dom, isOpen);
  dom.panel.style.display = isOpen ? "block" : "none";
  dom.panel.style.opacity = isOpen ? "1" : "0";
  dom.panel.style.transform = isOpen ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)";
  dom.panel.style.pointerEvents = isOpen ? "auto" : "none";
  dom.button.setAttribute("aria-expanded", String(isOpen));
  dom.button.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
  dom.button.innerHTML = isOpen ? WIDGET_OPEN_ICON : WIDGET_CLOSED_ICON;
  syncLauncherBubble(dom);
}

function setLoadingVisual(dom: PadynaDom, isLoading: boolean) {
  dom.loader.style.display = isLoading ? "flex" : "none";
}

function scheduleHideLoader(dom: PadynaDom) {
  if (state.hideLoaderTimer) {
    clearTimeout(state.hideLoaderTimer);
    state.hideLoaderTimer = null;
  }

  const elapsed = Date.now() - state.loaderShownAt;
  const remaining = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);

  if (remaining === 0) {
    setLoadingVisual(dom, false);
    return;
  }

  state.hideLoaderTimer = setTimeout(() => {
    state.hideLoaderTimer = null;
    if (state.dom) {
      setLoadingVisual(state.dom, false);
    }
  }, remaining);
}

async function fetchWidgetConfig(options: PadynaInitOptions, defaultServerUrl: string) {
  const apiUrl = normalizeApiUrl(options, defaultServerUrl);
  if (!apiUrl) {
    return null;
  }

  const url = new URL(`/api/widget/${options.widgetId}/config`, apiUrl);
  if (typeof window !== "undefined" && window.location.origin) {
    url.searchParams.set("hostOrigin", window.location.origin);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    primaryColor?: unknown;
    launcherMessage?: unknown;
  };

  const config: PadynaWidgetConfig = {};

  if (typeof payload.primaryColor === "string" && payload.primaryColor.trim().length > 0) {
    config.primaryColor = payload.primaryColor;
  }

  if (typeof payload.launcherMessage === "string") {
    config.launcherMessage = payload.launcherMessage;
  }

  return config;
}

function applyWidgetConfig(dom: PadynaDom, config: PadynaWidgetConfig | null) {
  if (config?.primaryColor) {
    dom.button.style.background = config.primaryColor;
  }

  if (typeof config?.launcherMessage === "string") {
    state.launcherMessage = config.launcherMessage;
  }

  syncLauncherBubble(dom);
}

function createDom(_defaultServerUrl: string): PadynaDom {
  const existingRoot = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  const existingButton = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  const existingPanel = document.getElementById(PANEL_ID) as HTMLDivElement | null;
  const existingIframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
  const existingBubble = document.getElementById(BUBBLE_ID) as HTMLDivElement | null;
  const existingBubbleText = document.getElementById(BUBBLE_TEXT_ID) as HTMLSpanElement | null;
  const existingBubbleClose = document.getElementById(BUBBLE_CLOSE_ID) as HTMLButtonElement | null;

  if (existingRoot && existingButton && existingPanel && existingIframe) {
    existingPanel.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.15)";
    const existingLoader = document.getElementById(LOADER_ID) as HTMLDivElement | null;
    const loader = existingLoader ?? document.createElement("div");
    if (!existingLoader) {
      loader.id = LOADER_ID;
      loader.style.position = "absolute";
      loader.style.inset = "0";
      loader.style.display = "none";
      loader.style.alignItems = "center";
      loader.style.justifyContent = "center";
      loader.style.background = "rgba(255,255,255,0.96)";
      loader.style.pointerEvents = "none";
      loader.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">${WIDGET_SPINNER_ICON}</div><style>@keyframes padyna-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>`;
      existingPanel.appendChild(loader);
    }

    const bubble = existingBubble ?? document.createElement("div");
    if (!existingBubble) {
      bubble.id = BUBBLE_ID;
      existingRoot.insertBefore(bubble, existingButton);
    }

    const bubbleText = existingBubbleText ?? document.createElement("span");
    if (!existingBubbleText) {
      bubbleText.id = BUBBLE_TEXT_ID;
      bubble.appendChild(bubbleText);
    }

    const bubbleClose = existingBubbleClose ?? document.createElement("button");
    if (!existingBubbleClose) {
      bubbleClose.id = BUBBLE_CLOSE_ID;
      bubble.appendChild(bubbleClose);
    }

    bubble.style.display = "none";
    bubble.style.alignItems = "center";
    bubble.style.gap = "10px";
    bubble.style.maxWidth = "min(280px, calc(100vw - 96px))";
    bubble.style.margin = "8px";
    bubble.style.padding = "12px 12px 12px 14px";
    bubble.style.borderRadius = "10px";
    bubble.style.background = "white";
    bubble.style.color = "black";
    bubble.style.boxShadow =
      "rgba(150, 150, 150, 0.2) 0px 10px 30px 0px, rgba(150, 150, 150, 0.2) 0px 0px 0px 1px";
    bubble.style.border = "0";
    bubble.style.fontSize = "14px";
    bubble.style.lineHeight = "1.4";
    bubble.style.cursor = "pointer";
    bubble.style.transition = "opacity 0.5s, transform 0.5s";
    bubble.style.transform = "scale(1)";
    bubble.style.opacity = "1";

    bubbleText.style.flex = "1";

    bubbleClose.type = "button";
    bubbleClose.setAttribute("aria-label", "Dismiss launcher message");
    bubbleClose.innerHTML = WIDGET_BUBBLE_CLOSE_ICON;
    bubbleClose.style.width = "24px";
    bubbleClose.style.height = "24px";
    bubbleClose.style.padding = "0";
    bubbleClose.style.display = "grid";
    bubbleClose.style.placeItems = "center";
    bubbleClose.style.flexShrink = "0";
    bubbleClose.style.border = "0";
    bubbleClose.style.borderRadius = "999px";
    bubbleClose.style.background = "transparent";
    bubbleClose.style.color = "#6b7280";
    bubbleClose.style.cursor = "pointer";

    return {
      root: existingRoot,
      button: existingButton,
      panel: existingPanel,
      iframe: existingIframe,
      loader,
      bubble,
      bubbleText,
      bubbleClose,
    };
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.position = "fixed";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "flex-end";
  root.style.right = "20px";
  root.style.bottom = "20px";
  root.style.zIndex = "2147483000";
  root.style.fontFamily =
    "'Inter', 'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif";

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.width = "min(400px, calc(100vw - 24px))";
  panel.style.height = "min(680px, calc(100vh - 96px))";
  panel.style.maxHeight = "680px";
  panel.style.marginBottom = "12px";
  panel.style.borderRadius = "16px";
  panel.style.overflow = "hidden";
  panel.style.background = "#ffffff";
  panel.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.15)";
  panel.style.transformOrigin = "bottom right";
  panel.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
  panel.style.transform = "scale(0.8) translateY(20px)";
  panel.style.display = "none";
  panel.style.position = "relative";

  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_ID;
  iframe.title = "Padyna chat widget";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";

  const loader = document.createElement("div");
  loader.id = LOADER_ID;
  loader.style.position = "absolute";
  loader.style.inset = "0";
  loader.style.display = "none";
  loader.style.alignItems = "center";
  loader.style.justifyContent = "center";
  loader.style.background = "rgba(255,255,255,0.96)";
  loader.style.pointerEvents = "none";
  loader.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px">${WIDGET_SPINNER_ICON}</div><style>@keyframes padyna-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>`;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.innerHTML = WIDGET_CLOSED_ICON;
  button.style.width = "56px";
  button.style.height = "56px";
  button.style.padding = "0";
  button.style.display = "grid";
  button.style.placeItems = "center";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.background = "#6366f1";
  button.style.color = "#ffffff";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.12)";
  button.style.visibility = "hidden";

  const bubble = document.createElement("div");
  bubble.id = BUBBLE_ID;
  bubble.style.display = "none";
  bubble.style.alignItems = "center";
  bubble.style.gap = "10px";
  bubble.style.maxWidth = "min(280px, calc(100vw - 96px))";
  bubble.style.margin = "8px";
  bubble.style.padding = "12px 12px 12px 14px";
  bubble.style.borderRadius = "10px";
  bubble.style.background = "white";
  bubble.style.color = "black";
  bubble.style.boxShadow =
    "rgba(150, 150, 150, 0.2) 0px 10px 30px 0px, rgba(150, 150, 150, 0.2) 0px 0px 0px 1px";
  bubble.style.border = "0";
  bubble.style.fontSize = "14px";
  bubble.style.lineHeight = "1.4";
  bubble.style.cursor = "pointer";
  bubble.style.transition = "opacity 0.5s, transform 0.5s";
  bubble.style.transform = "scale(1)";
  bubble.style.opacity = "1";

  const bubbleText = document.createElement("span");
  bubbleText.id = BUBBLE_TEXT_ID;
  bubbleText.style.flex = "1";

  const bubbleClose = document.createElement("button");
  bubbleClose.id = BUBBLE_CLOSE_ID;
  bubbleClose.type = "button";
  bubbleClose.setAttribute("aria-label", "Dismiss launcher message");
  bubbleClose.innerHTML = WIDGET_BUBBLE_CLOSE_ICON;
  bubbleClose.style.width = "24px";
  bubbleClose.style.height = "24px";
  bubbleClose.style.padding = "0";
  bubbleClose.style.display = "grid";
  bubbleClose.style.placeItems = "center";
  bubbleClose.style.flexShrink = "0";
  bubbleClose.style.border = "0";
  bubbleClose.style.borderRadius = "999px";
  bubbleClose.style.background = "transparent";
  bubbleClose.style.color = "#6b7280";
  bubbleClose.style.cursor = "pointer";

  bubble.appendChild(bubbleText);
  bubble.appendChild(bubbleClose);

  panel.appendChild(iframe);
  panel.appendChild(loader);
  root.appendChild(panel);
  root.appendChild(bubble);
  root.appendChild(button);
  document.body.appendChild(root);

  return { root, button, panel, iframe, loader, bubble, bubbleText, bubbleClose };
}

const state: PadynaState = {
  isInitialized: false,
  isOpen: false,
  isVisible: false,
  initOptions: null,
  defaultServerUrl: typeof window !== "undefined" ? inferDefaultServerUrl() : "",
  dom: null,
  onKeydown: null,
  onMessage: null,
  onResize: null,
  isIframeLoaded: false,
  isIframeBootstrapped: false,
  widgetUrl: "",
  widgetOrigin: "",
  onBeforeUnload: null,
  loaderShownAt: 0,
  hideLoaderTimer: null,
  launcherMessage: DEFAULT_LAUNCHER_MESSAGE,
  isLauncherMessageDismissed: false,
};

function postToWidget(message: { type: string }) {
  const target = state.dom?.iframe.contentWindow;
  if (target && state.widgetOrigin) {
    target.postMessage(message, state.widgetOrigin);
  }
}

// The iframe loads the full chat app, so it's only fetched once someone shows intent
// (hover/focus on the launcher) or opens the widget, not on every host page view.
function ensureIframeLoading() {
  const dom = state.dom;
  if (!dom || state.isIframeBootstrapped || !state.widgetUrl) {
    return;
  }

  state.isIframeBootstrapped = true;
  dom.iframe.onload = () => {
    state.isIframeLoaded = true;
    if (state.dom && state.isOpen) {
      scheduleHideLoader(state.dom);
      // The open event fired before the iframe could listen; replay it.
      postToWidget({ type: "padyna:widget_open" });
    }
  };
  dom.iframe.src = state.widgetUrl;
}

async function runCommand(command: PadynaCommand, options?: PadynaInitOptions) {
  if (command === "init") {
    if (!options?.widgetId) {
      console.error("[Padyna] init requires widgetId");
      return;
    }

    const dom = state.dom ?? createDom(state.defaultServerUrl);
    state.dom = dom;
    state.isInitialized = true;
    state.initOptions = options;
    state.isIframeLoaded = false;
    state.isIframeBootstrapped = false;
    state.launcherMessage = DEFAULT_LAUNCHER_MESSAGE;
    state.isLauncherMessageDismissed = readLauncherMessageDismissed(options.widgetId);

    syncLauncherBubble(dom);

    if (!state.onBeforeUnload) {
      state.onBeforeUnload = () => postToWidget({ type: "parent-page-unload" });
      window.addEventListener("beforeunload", state.onBeforeUnload);
    }

    state.widgetUrl = buildWidgetUrl(options, state.defaultServerUrl);
    state.widgetOrigin = state.widgetUrl ? new URL(state.widgetUrl).origin : "";
    dom.button.onpointerenter = ensureIframeLoading;
    dom.button.onfocus = ensureIframeLoading;

    try {
      const widgetConfig = await fetchWidgetConfig(options, state.defaultServerUrl);
      applyWidgetConfig(dom, widgetConfig);
    } catch {
      applyWidgetConfig(dom, null);
    } finally {
      dom.button.style.visibility = "visible";
      syncLauncherBubble(dom);
    }

    dom.button.onclick = () => {
      runCommand(state.isOpen ? "close" : "open");
    };

    dom.bubble.onclick = () => {
      if (!state.isOpen) {
        runCommand("open");
      }
    };

    dom.bubbleClose.onclick = (event) => {
      event.stopPropagation();

      state.isLauncherMessageDismissed = true;
      persistLauncherMessageDismissed(options.widgetId, true);
      syncLauncherBubble(dom);
    };

    if (!state.onKeydown) {
      state.onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && state.isOpen) {
          runCommand("close");
        }
      };
      document.addEventListener("keydown", state.onKeydown);
    }

    if (!state.onMessage) {
      state.onMessage = (event: MessageEvent) => {
        if (event.source !== state.dom?.iframe.contentWindow) {
          return;
        }

        if ((event.data as { type?: string } | null)?.type === "padyna:widget_request_close") {
          runCommand("close");
        }
      };
      window.addEventListener("message", state.onMessage);
    }

    if (!state.onResize) {
      state.onResize = () => {
        if (state.dom) {
          applyOpenState(state.dom, state.isOpen);
        }
      };
      window.addEventListener("resize", state.onResize);
    }

    applyOpenState(dom, false);
    return;
  }

  if (!state.isInitialized) {
    console.error(`[Padyna] ${command} requires init first`);
    return;
  }

  if (command === "open") {
    if (!state.dom) {
      return;
    }
    state.isOpen = true;
    state.isVisible = true;
    applyOpenState(state.dom, true);

    if (!state.isIframeLoaded) {
      state.loaderShownAt = Date.now();
      setLoadingVisual(state.dom, true);
      ensureIframeLoading();
      // widget_open is sent from the iframe's onload once it can receive it.
      return;
    }

    postToWidget({ type: "padyna:widget_open" });

    return;
  }

  if (command === "close") {
    if (!state.dom) {
      return;
    }

    // Notify the iframe that the widget is closing so it can fire widget_close analytics
    if (state.isIframeLoaded) {
      postToWidget({ type: "padyna:widget_close" });
    }

    state.isOpen = false;

    if (state.hideLoaderTimer) {
      clearTimeout(state.hideLoaderTimer);
      state.hideLoaderTimer = null;
    }
    setLoadingVisual(state.dom, false);
    applyOpenState(state.dom, false);
    return;
  }

  if (state.onKeydown) {
    document.removeEventListener("keydown", state.onKeydown);
    state.onKeydown = null;
  }

  if (state.onMessage) {
    window.removeEventListener("message", state.onMessage);
    state.onMessage = null;
  }

  if (state.onResize) {
    window.removeEventListener("resize", state.onResize);
    state.onResize = null;
  }

  if (state.onBeforeUnload) {
    window.removeEventListener("beforeunload", state.onBeforeUnload);
    state.onBeforeUnload = null;
  }

  // Undo the scroll lock applied while open full-screen on mobile.
  document.body.style.overflow = "";

  if (state.dom?.root.isConnected) {
    state.dom.root.remove();
  }

  state.dom = null;
  state.isOpen = false;
  state.isVisible = false;
  state.isInitialized = false;
  state.initOptions = null;
  state.isIframeBootstrapped = false;
  state.isIframeLoaded = false;
  state.widgetUrl = "";
  state.widgetOrigin = "";
  state.launcherMessage = "";
  state.isLauncherMessageDismissed = false;
  if (state.hideLoaderTimer) {
    clearTimeout(state.hideLoaderTimer);
    state.hideLoaderTimer = null;
  }
}

function drainQueue(queued: unknown[][]) {
  for (const item of queued) {
    const command = item[0];
    const maybeOptions = item[1];

    if (
      (command === "init" || command === "open" || command === "close" || command === "destroy") &&
      typeof command === "string"
    ) {
      runCommand(command, maybeOptions as PadynaInitOptions | undefined);
    }
  }
}

const Padyna: PadynaCallable = Object.assign(
  (command: PadynaCommand, options?: PadynaInitOptions) => {
    void runCommand(command, options);
  },
) as PadynaCallable;

if (typeof window !== "undefined") {
  const queued = Array.isArray(window.Padyna?.q) ? window.Padyna.q : [];

  window.Padyna = Padyna;

  if (queued.length > 0) {
    drainQueue(queued);
  }
}
