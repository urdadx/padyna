# Feature Screenshots

`actions.webp`, `analytics.webp` and `livechat.webp` (the Chat logs page) are
2880×1620 captures of the real dashboard (`apps/web`) at a 1440×810 viewport
with 2× device scale. They were taken with Playwright against `pnpm dev:web`,
with every request to the API server (tRPC, Better Auth session,
`/api/actions`, analytics SSE stream) answered by dummy fixtures, so no real
customer data appears in them.

On tablets and desktops the Playground tab is not an image:
`public/demos/playground.html` (1280×720) is a DOM snapshot of the real
Playground page captured the same way, with a mocked `/api/chat` stream. It
keeps only the CSS rules and font files the snapshot uses, and
`public/demos/player.js` replays the captured conversation. Phones get
`playground.webp`, a 2.25× render of that snapshot's finished conversation.

`public/demos/escalation.html` (400×640, the size of the embedded widget
panel) is the same kind of snapshot of the customer chat widget (`/widget`),
used by the "Human in the loop" section. It was captured with a mocked
`/api/widget/:id/chat` stream that calls `escalate_to_human` and a mocked
live-chat WebSocket in which a teammate joins, types and replies.
