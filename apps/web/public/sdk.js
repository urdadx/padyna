(function (global) {
  var ROOT_ID = "padyna-widget-root";
  var BUTTON_ID = "padyna-widget-button";
  var PANEL_ID = "padyna-widget-panel";
  var IFRAME_ID = "padyna-widget-iframe";
  var WIDGET_CLOSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10c-1.6 0-3.112-.376-4.452-1.044a1.63 1.63 0 0 0-1.149-.133l-2.226.596a1.3 1.3 0 0 1-1.591-1.592l.595-2.226a1.63 1.63 0 0 0-.134-1.148A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10M12 7.25a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75M8.75 10a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0zM16 9.25a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75" clip-rule="evenodd"/></svg>';
  var WIDGET_OPEN_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>';

  var state = {
    isInitialized: false,
    isOpen: false,
    initOptions: null,
    dom: null,
    onKeydown: null,
    onMessage: null,
  };

  function normalizeServerUrl(serverUrl) {
    if (typeof serverUrl === "string" && serverUrl.trim().length > 0) {
      return serverUrl.replace(/\/$/, "");
    }
    return global.location.origin;
  }

  function buildWidgetUrl(options) {
    var base = normalizeServerUrl(options.serverUrl);
    var url = new URL("/widget", base);
    url.searchParams.set("widgetId", options.widgetId);
    if (global.location && global.location.origin) {
      url.searchParams.set("hostOrigin", global.location.origin);
    }
    return url.toString();
  }

  function applyOpenState(dom, isOpen) {
    dom.panel.style.opacity = isOpen ? "1" : "0";
    dom.panel.style.transform = isOpen
      ? "translateY(0) scale(1)"
      : "translateY(12px) scale(0.98)";
    dom.panel.style.pointerEvents = isOpen ? "auto" : "none";
    dom.button.setAttribute("aria-expanded", String(isOpen));
    dom.button.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
    dom.button.innerHTML = isOpen ? WIDGET_OPEN_ICON : WIDGET_CLOSE_ICON;
  }

  async function applyWidgetBranding(options, dom) {
    var base = normalizeServerUrl(options.serverUrl);
    if (!base) return;

    try {
      var url = new URL("/api/widget/" + options.widgetId + "/config", base);
      if (global.location && global.location.origin) {
        url.searchParams.set("hostOrigin", global.location.origin);
      }

      var response = await fetch(url.toString());
      if (!response.ok) return;

      var payload = await response.json();
      if (payload && typeof payload.primaryColor === "string" && payload.primaryColor.trim()) {
        dom.button.style.background = payload.primaryColor;
      }
    } catch (_err) {
      // Ignore branding fetch errors.
    }
  }

  function handleWidgetMessage(event) {
    if (!state.dom) return;
    if (event.source !== state.dom.iframe.contentWindow) return;
    if (!event.data || typeof event.data !== "object") return;

    var payload = event.data;
    if (payload.type !== "padyna:widget:config") return;
    if (!state.initOptions || payload.widgetId !== state.initOptions.widgetId) return;

    if (typeof payload.primaryColor === "string" && payload.primaryColor.trim()) {
      state.dom.button.style.background = payload.primaryColor;
    }
  }

  function createDom() {
    var existingRoot = document.getElementById(ROOT_ID);
    var existingButton = document.getElementById(BUTTON_ID);
    var existingPanel = document.getElementById(PANEL_ID);
    var existingIframe = document.getElementById(IFRAME_ID);

    if (existingRoot && existingButton && existingPanel && existingIframe) {
      return {
        root: existingRoot,
        button: existingButton,
        panel: existingPanel,
        iframe: existingIframe,
      };
    }

    var root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.position = "fixed";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.alignItems = "flex-end";
    root.style.right = "20px";
    root.style.bottom = "20px";
    root.style.zIndex = "2147483000";
    root.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

    var panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.width = "min(400px, calc(100vw - 24px))";
    panel.style.height = "min(680px, calc(100vh - 96px))";
    panel.style.maxHeight = "680px";
    panel.style.marginBottom = "12px";
    panel.style.borderRadius = "16px";
    panel.style.overflow = "hidden";
    panel.style.background = "#ffffff";
    panel.style.boxShadow =
      "0 14px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)";
    panel.style.transformOrigin = "bottom right";
    panel.style.transition = "opacity 180ms ease, transform 180ms ease";

    var iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.title = "Padyna chat widget";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";

    var button = document.createElement("button");
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
    button.style.boxShadow = "none";

    panel.appendChild(iframe);
    root.appendChild(panel);
    root.appendChild(button);
    document.body.appendChild(root);

    return { root: root, button: button, panel: panel, iframe: iframe };
  }

  function run(command, options) {
    if (command === "init") {
      if (!options || !options.widgetId) {
        console.error("[Padyna] init requires widgetId");
        return;
      }

      state.dom = state.dom || createDom();
      state.isInitialized = true;
      state.initOptions = options;
      state.dom.iframe.src = buildWidgetUrl(options);
      void applyWidgetBranding(options, state.dom);

      state.dom.button.onclick = function () {
        run(state.isOpen ? "close" : "open");
      };

      if (!state.onKeydown) {
        state.onKeydown = function (event) {
          if (event.key === "Escape" && state.isOpen) {
            run("close");
          }
        };
        document.addEventListener("keydown", state.onKeydown);
      }

      if (!state.onMessage) {
        state.onMessage = function (event) {
          handleWidgetMessage(event);
        };
        global.addEventListener("message", state.onMessage);
      }

      applyOpenState(state.dom, false);
      return;
    }

    if (!state.isInitialized) {
      console.error("[Padyna] " + command + " requires init first");
      return;
    }

    if (command === "open") {
      state.isOpen = true;
      applyOpenState(state.dom, true);
      return;
    }

    if (command === "close") {
      state.isOpen = false;
      applyOpenState(state.dom, false);
      return;
    }

    if (state.onKeydown) {
      document.removeEventListener("keydown", state.onKeydown);
      state.onKeydown = null;
    }

    if (state.onMessage) {
      global.removeEventListener("message", state.onMessage);
      state.onMessage = null;
    }

    if (state.dom && state.dom.root && state.dom.root.isConnected) {
      state.dom.root.remove();
    }

    state.dom = null;
    state.isOpen = false;
    state.isInitialized = false;
    state.initOptions = null;
  }

  function api(command, options) {
    run(command, options);
  }

  var queued = Array.isArray(global.Padyna && global.Padyna.q) ? global.Padyna.q : [];
  global.Padyna = api;

  if (queued.length > 0) {
    for (var i = 0; i < queued.length; i++) {
      var item = queued[i];
      var cmd = item[0];
      var opts = item[1];
      if (cmd === "init" || cmd === "open" || cmd === "close" || cmd === "destroy") {
        run(cmd, opts);
      }
    }
  }
})(window);
