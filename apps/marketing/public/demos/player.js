// Replays a captured dashboard conversation inside its static snapshot page.
// The snapshot is the finished conversation, so it reads correctly before (or
// without) playback. Steps are elements marked `data-step`, in document order:
//   type  – type `data-text` into the `[data-input]` field, then reveal
//   reply – show the `[data-typing=<data-typing|ai>]` indicator, reveal, then
//           stream the words of every `[data-stream]` element
//   show  – reveal
// `data-delay` waits before a step and `data-think` sets how long the typing
// indicator shows (ms). `data-phase-start` / `data-phase` switch the page phase
// when a step starts / is revealed: elements marked `data-phase-show=<phase>`
// only show during that phase, and the input takes its placeholder from
// `data-placeholder-<phase>` (disabled when `data-disabled-phases` lists it).
// The body's `data-phase` is the finished state; playback starts from the
// `data-initial-phase`. The parent page drives playback via
// `window.demo.setPlaying(boolean)`.
(() => {
  const steps = [...document.querySelectorAll("[data-step]")];
  const input = document.querySelector("[data-input]");
  const send = document.querySelector("[data-send]");
  const scroller = document.querySelector("[data-scroller]");
  const indicators = [...document.querySelectorAll("[data-typing]")];
  const initialPhase = document.body.dataset.initialPhase;
  const disabledPhases = (input?.dataset.disabledPhases ?? "").split(" ");
  const streams = new Map(
    [...document.querySelectorAll("[data-stream]")].map((el) => [
      el,
      el.textContent,
    ]),
  );
  // Characters per second: a brisk typist, and a fast model stream.
  const TYPING_SPEED = 32;
  const STREAM_SPEED = 110;
  let playing = false;
  let running = false;

  const scrollToEnd = () =>
    scroller && (scroller.scrollTop = scroller.scrollHeight);
  scrollToEnd();

  // Runs `update(elapsedMs)` once per frame until it returns true, counting
  // only time spent playing, so pausing freezes the demo mid-step. Reads the
  // clock directly: rAF timestamps can lag real time in a throttled iframe.
  const animate = (update) =>
    new Promise((resolve) => {
      let elapsed = 0;
      let last = performance.now();
      const tick = () => {
        const now = performance.now();
        if (playing) elapsed += now - last;
        last = now;
        if (update(elapsed)) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const wait = (ms) => animate((elapsed) => elapsed >= ms);

  // Reveals `text` at a steady `perSecond` characters, as many as the elapsed
  // time allows each frame, so the pace doesn't depend on the frame rate.
  const revealText = (text, perSecond, show) => {
    let shown = -1;
    return animate((elapsed) => {
      const count = Math.min(
        text.length,
        Math.floor((elapsed / 1000) * perSecond),
      );
      if (count !== shown) show(text.slice(0, (shown = count)));
      return count === text.length;
    });
  };

  const isDisabled = () => disabledPhases.includes(document.body.dataset.phase);

  const setInput = (value) => {
    if (!input) return;
    input.value = value;
    input.setAttribute("value", value);
    if (send) send.disabled = isDisabled() || value.trim().length === 0;
  };

  const setPhase = (phase) => {
    if (!phase) return;
    document.body.dataset.phase = phase;
    if (!input) return;
    const placeholder =
      input.dataset[`placeholder${phase[0].toUpperCase()}${phase.slice(1)}`];
    if (placeholder) input.placeholder = placeholder;
    input.disabled = isDisabled();
    setInput(input.value);
    scrollToEnd();
  };

  const reveal = (el) => {
    el.classList.remove("demo-hidden");
    scrollToEnd();
  };

  const reset = () => {
    steps.forEach((step) => step.classList.add("demo-hidden"));
    indicators.forEach((el) => el.classList.add("demo-hidden"));
    setPhase(initialPhase);
    setInput("");
    scrollToEnd();
  };

  const runStep = async (step) => {
    await wait(Number(step.dataset.delay ?? 700));
    setPhase(step.dataset.phaseStart);
    const kind = step.dataset.step;

    if (kind === "type") {
      await revealText(step.dataset.text ?? "", TYPING_SPEED, setInput);
      await wait(350);
      setInput("");
    }

    const indicator =
      kind === "reply" &&
      document.querySelector(`[data-typing="${step.dataset.typing ?? "ai"}"]`);
    if (indicator) {
      step.before(indicator);
      reveal(indicator);
      await wait(Number(step.dataset.think ?? 1300));
      indicator.classList.add("demo-hidden");
    }

    if (kind === "reply")
      streams.forEach((_, el) => step.contains(el) && (el.textContent = ""));
    setPhase(step.dataset.phase);
    reveal(step);

    if (kind === "reply") {
      for (const [el, full] of streams) {
        if (!step.contains(el)) continue;
        await revealText(full, STREAM_SPEED, (text) => {
          el.textContent = text;
          scrollToEnd();
        });
      }
    }
  };

  const loop = async () => {
    running = true;
    for (;;) {
      reset();
      await wait(800);
      for (const step of steps) await runStep(step);
      await wait(5000);
    }
  };

  window.demo = {
    setPlaying(next) {
      playing = next;
      if (playing && !running) void loop();
    },
  };
})();
