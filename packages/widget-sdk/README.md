# @padyna/widget-sdk

Embeddable browser SDK for loading the Padyna chat widget.

Build output is a single script file at `dist/sdk.js`.

## API

Global: `window.Padyna`

- `Padyna("init", { widgetId, serverUrl? })`
- `Padyna("open")`
- `Padyna("close")`
- `Padyna("destroy")`

`serverUrl` should point to the web app host that serves `/widget` and `/sdk.js`.
The widget iframe itself will call the API host configured by `VITE_SERVER_URL` in the web app.

## Script Usage

```html
<script src="https://YOUR_HOST/sdk.js" async></script>
<script>
  window.Padyna("init", {
    widgetId: "pd_xxxxxxxx",
    serverUrl: "https://YOUR_WEB_ORIGIN"
  });
</script>
```

## React Usage

```tsx
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://YOUR_HOST/sdk.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.Padyna("init", {
        widgetId: "pd_xxxxxxxx",
        serverUrl: "https://YOUR_WEB_ORIGIN"
      });
    };
  }, []);

  return null;
}
```

## Local Test

1. Start server app (API): `pnpm --filter server dev`
2. Start web app (widget host): `pnpm --filter web dev`
3. Open any test page and run:

```html
<script src="http://localhost:3001/sdk.js" async></script>
<script>
  window.Padyna("init", {
    widgetId: "pd_fZtwHhKTb4QX",
    serverUrl: "http://localhost:3001"
  });
</script>
```
