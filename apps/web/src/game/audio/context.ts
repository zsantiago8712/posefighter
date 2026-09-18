/**
 * One AudioContext shared by every Phaser game instance (one per round).
 *
 * Browsers keep audio suspended until it is created/resumed INSIDE a user gesture. In the camera flow the
 * player never touches the screen during the battle, so MULTIPLAYER calls `unlockAudio()` from the last
 * guaranteed tap (picking a fighter in the lobby) and from any pointerdown on the battle screen. Because the
 * same context is handed to Phaser, once it is running every later round has sound.
 *
 * This module must stay light (no Phaser import) so it can be called before the game bundle loads.
 */
let sharedAudioContext: AudioContext | undefined;

export function getSharedAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  if (!sharedAudioContext) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return undefined;
    sharedAudioContext = new Ctx();
    const resume = () => {
      void sharedAudioContext?.resume();
    };
    for (const type of ["pointerdown", "touchend", "keydown"] as const) {
      window.addEventListener(type, resume, { passive: true });
    }
  }
  if (sharedAudioContext.state === "suspended") void sharedAudioContext.resume();
  return sharedAudioContext;
}

/** Call from a user-gesture handler (click/tap). Safe to call repeatedly. */
export function unlockAudio(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  // Play a silent buffer: on iOS this is what actually flips the context to "running".
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // audio is decoration
  }
}
