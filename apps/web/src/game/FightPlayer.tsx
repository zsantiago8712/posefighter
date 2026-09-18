import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import type * as Phaser from "phaser";
import { useEffect, useRef } from "react";

export interface FightPlayerProps {
  /** Already-resolved round. The player only presents it; it never changes HP. */
  result: CombatResult;
  /** Called once when the cinematic ends (≤ 10 s). */
  onComplete?: () => void;
}

const FONT_LINK_ID = "pf-font-bangers";

/** Arcade webfont (Google Fonts, OFL). Falls back to Impact if it doesn't arrive within 1.5 s. */
async function ensureFont(): Promise<void> {
  if (typeof document === "undefined") return;
  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bangers&display=swap";
    document.head.appendChild(link);
  }
  try {
    await Promise.race([document.fonts.load('48px "Bangers"'), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    // font is decoration
  }
}

/**
 * Self-contained Phaser host. Fills its parent (min 100dvh so a bare mount is still full-screen). Phaser is imported client-side only, the game is destroyed on unmount,
 * and remounting (next round) creates a fresh instance.
 */
export function FightPlayer({ result, onComplete }: FightPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: Phaser.Game | undefined;
    let cancelled = false;

    void (async () => {
      const [{ createGame }] = await Promise.all([import("./createGame"), ensureFont()]);
      if (cancelled) return;
      game = createGame(host, result, () => {
        if (!cancelled) onCompleteRef.current?.();
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = undefined;
    };
  }, [result]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100dvh",
        overflow: "hidden",
        touchAction: "none",
        overscrollBehavior: "none",
        background: "#0a0614",
        position: "relative",
      }}
    />
  );
}
