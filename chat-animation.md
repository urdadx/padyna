1. Overall Layout & Background

Full-screen centered container (1920×1080 or responsive with max-w-[1280px]).
Background: bg-white
The main UI is a large floating panel with heavy rounded corners (≈ 24px), subtle drop shadow, and a slight glass-morphic feel.

2. UI Panel Structure
   Header (dark green gradient #0F2C1F → #1A3F2E):

Left side: 32×32 pixel-art fern mascot avatar + text “What can I help with?” in white, medium font.
Right side: “Connected to” + green live dot + three small icons (Discord, Slack, and a purple icon) + a toggle switch (on state).

Main Content Area:

Starts as a clean white panel (background #FAFAFA, border radius matching the outer panel).

Bottom Bar (always visible until article is generated):

Left: circular attachment icon (chain link).
Right: large prominent button with green play icon + text “Write my docs / try it!” (matches exact button style from video).

3. Exact Interaction Flow (use Framer Motion for everything)
   Phase 1 – User Typing (0–11 seconds in video)

User message appears character-by-character inside the white content area (exactly like real typing).
Message:
“Hey Fern,”
then on new line:
“Can you write a help article for our new CSV exporter?”
Use a realistic typing animation (cursor blinking at the end). Animate each character with a very small spring.
The “Write my docs / try it!” button gets a green play icon when text is present.

Phase 2 – Sending & Processing (12–23 seconds)

When the message is “sent”, the input area disappears with a smooth slide-up fade.
The white panel expands slightly and shows a new state titled “Searching your knowledge base” with a magnifying glass icon.
Then a vertical list of steps appears one by one (exactly in this order, with 300–500ms delay between each):
🔎 Searching your knowledge base
📋 Reading support tickets
💻 Browsing your codebase
📸 Taking screenshots
📐 Planning content structure
🔗 Linking to other articles
✍️ Writing...

Each step uses Framer Motion animate with staggerChildren + variants so they fade in and slide up sequentially with a tiny bounce.
Show a subtle loading bar or pulsing dot on the current step.

Phase 3 – Article Reveal (24–30 seconds)

After “Writing…” finishes, the entire panel transitions to the finished article view with:
Top bar: small fern avatar + “I’ve drafted this article!” + black “Publish draft” button (top-right).
Article title (bold, large): “How to export your Ferndesk articles to a CSV”
Body text exactly as shown in the video (including the blue info box “Learn more about advanced export options in our API documentation.”).
Section “Getting started” with the first paragraph visible.
Scrollable content area (use overflow-auto).

Use a nice page-turn / content-reveal animation (scale + opacity) when the article appears.

4. Animation Requirements (Framer Motion only)

All text typing must feel natural.
Every step must use layout + animate + variants for buttery-smooth sequential reveal.
Panel should have subtle hover lift and micro-interactions.
When switching from typing → processing → article, use AnimatePresence with mode="wait" and nice cross-fades / scale transitions.
Add a very light background water ripple using CSS filter or a secondary Framer Motion div if possible.

6. Extra Polish

Cursor should be a custom blinking text cursor during typing.
Add a tiny black circular “minimize” icon (laptop) in the bottom-right corner of the screen like in the video.
