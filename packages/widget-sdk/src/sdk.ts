import type { PadynaCallable } from "./types";
import type { PadynaCommand, PadynaInitOptions } from "./types";

const ROOT_ID = "padyna-widget-root";
const BUTTON_ID = "padyna-widget-button";
const PANEL_ID = "padyna-widget-panel";
const IFRAME_ID = "padyna-widget-iframe";
const LOADER_ID = "padyna-widget-loader";
const MIN_LOADER_VISIBLE_MS = 10;

const WIDGET_OPEN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>`;
const WIDGET_CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10c-1.6 0-3.112-.376-4.452-1.044a1.63 1.63 0 0 0-1.149-.133l-2.226.596a1.3 1.3 0 0 1-1.591-1.592l.595-2.226a1.63 1.63 0 0 0-.134-1.148A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10M12 7.25a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75M8.75 10a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0zM16 9.25a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75" clip-rule="evenodd"/></svg>`;
const WIDGET_SPINNER_ICON = `<div style="width:22px;height:22px;border-radius:50%;border:2.5px solid #e5e7eb;border-top-color:#6b7280;animation:padyna-spin 0.75s linear infinite"></div>`;

type PadynaDom = {
  root: HTMLDivElement;
  button: HTMLButtonElement;
  panel: HTMLDivElement;
  iframe: HTMLIFrameElement;
  loader: HTMLDivElement;
};

type PadynaState = {
  isInitialized: boolean;
  isOpen: boolean;
  initOptions: PadynaInitOptions | null;
  defaultServerUrl: string;
  dom: PadynaDom | null;
  onKeydown: ((event: KeyboardEvent) => void) | null;
  isIframeLoaded: boolean;
  isIframeBootstrapped: boolean;
  loaderShownAt: number;
  hideLoaderTimer: ReturnType<typeof setTimeout> | null;
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
  if (typeof window !== "undefined" && window.location.origin) {
    url.searchParams.set("hostOrigin", window.location.origin);
  }
  return url.toString();
}

function applyOpenState(dom: PadynaDom, isOpen: boolean) {
  dom.panel.style.display = isOpen ? "block" : "none";
  dom.panel.style.opacity = isOpen ? "1" : "0";
  dom.panel.style.transform = isOpen ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)";
  dom.panel.style.pointerEvents = isOpen ? "auto" : "none";
  dom.button.setAttribute("aria-expanded", String(isOpen));
  dom.button.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
  dom.button.innerHTML = isOpen ? WIDGET_OPEN_ICON : WIDGET_CLOSE_ICON;
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

async function fetchWidgetPrimaryColor(options: PadynaInitOptions, defaultServerUrl: string) {
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

  const payload = (await response.json()) as { primaryColor?: unknown };
  if (typeof payload.primaryColor === "string" && payload.primaryColor.trim().length > 0) {
    return payload.primaryColor;
  }

  return null;
}

async function applyWidgetBranding(
  options: PadynaInitOptions,
  defaultServerUrl: string,
  dom: PadynaDom,
) {
  try {
    const color = await fetchWidgetPrimaryColor(options, defaultServerUrl);
    if (color) {
      dom.button.style.background = color;
    }
  } catch {
    // Ignore branding failures, widget still works with fallback colors.
  }
}

function createDom(defaultServerUrl: string): PadynaDom {
  const existingRoot = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  const existingButton = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  const existingPanel = document.getElementById(PANEL_ID) as HTMLDivElement | null;
  const existingIframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;

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

    return {
      root: existingRoot,
      button: existingButton,
      panel: existingPanel,
      iframe: existingIframe,
      loader,
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
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.src = defaultServerUrl ? `${defaultServerUrl}/widget` : "about:blank";

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
  button.innerHTML = WIDGET_CLOSE_ICON;
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

  panel.appendChild(iframe);
  panel.appendChild(loader);
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);

  return { root, button, panel, iframe, loader };
}

const state: PadynaState = {
  isInitialized: false,
  isOpen: false,
  initOptions: null,
  defaultServerUrl: typeof window !== "undefined" ? inferDefaultServerUrl() : "",
  dom: null,
  onKeydown: null,
  isIframeLoaded: false,
  isIframeBootstrapped: false,
  loaderShownAt: 0,
  hideLoaderTimer: null,
};

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

    try {
      const preloadedColor = await fetchWidgetPrimaryColor(options, state.defaultServerUrl);
      if (preloadedColor) {
        dom.button.style.background = preloadedColor;
      }
    } catch {
    } finally {
      dom.button.style.visibility = "visible";
    }

    void applyWidgetBranding(options, state.defaultServerUrl, dom);

    dom.button.onclick = () => {
      runCommand(state.isOpen ? "close" : "open");
    };

    if (!state.onKeydown) {
      state.onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && state.isOpen) {
          runCommand("close");
        }
      };
      document.addEventListener("keydown", state.onKeydown);
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
    applyOpenState(state.dom, true);
    if (!state.isIframeLoaded) {
      state.loaderShownAt = Date.now();
      setLoadingVisual(state.dom, true);
    }

    if (!state.isIframeBootstrapped && state.initOptions) {
      state.isIframeBootstrapped = true;
      state.dom.iframe.onload = () => {
        state.isIframeLoaded = true;
        if (state.dom) {
          scheduleHideLoader(state.dom);
        }
      };
      state.dom.iframe.src =
        buildWidgetUrl(state.initOptions, state.defaultServerUrl) || "about:blank";
    }

    return;
  }

  if (command === "close") {
    if (!state.dom) {
      return;
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

  if (state.dom?.root.isConnected) {
    state.dom.root.remove();
  }

  state.dom = null;
  state.isOpen = false;
  state.isInitialized = false;
  state.initOptions = null;
  state.isIframeBootstrapped = false;
  state.isIframeLoaded = false;
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

export const Padyna: PadynaCallable = ((command: PadynaCommand, options?: PadynaInitOptions) => {
  void runCommand(command, options);
}) as PadynaCallable;

if (typeof window !== "undefined") {
  const queued = Array.isArray(window.Padyna?.q) ? window.Padyna.q : [];

  window.Padyna = Padyna;

  if (queued.length > 0) {
    drainQueue(queued);
  }
}
