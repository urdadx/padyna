// A short chime made with the Web Audio API, so there's no sound file to host.
//
// Browsers only let a page make sound after the visitor has interacted with it. The
// audio context is created on the first click or key press in the widget, which comes
// before an agent can join (the visitor has written a message to escalate).

let context: AudioContext | null = null;

function unlock() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    context ??= new AudioContextClass();
    if (context.state === "suspended") void context.resume();
  } catch {
    // No audio available: notifications stay silent.
  }
}

if (typeof window !== "undefined") {
  for (const type of ["pointerdown", "keydown"] as const) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
}

/** Two rising notes, soft and short. Silent if the visitor hasn't interacted yet. */
export function playAgentJoinedSound() {
  if (!context || context.state !== "running") return;
  const start = context.currentTime;

  [659.25, 880].forEach((frequency, index) => {
    const at = start + index * 0.14;
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    // Quick fade in and out, so the notes don't click.
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.18, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.4);
  });
}
