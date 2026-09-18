import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import * as Phaser from "phaser";
import { BACKGROUND_COLOR, pickLayout } from "./config";
import { BootScene } from "./scenes/BootScene";
import { FIGHT_COMPLETE_EVENT, FightScene } from "./scenes/FightScene";

let sharedAudioContext: AudioContext | undefined;

/**
 * One AudioContext for every FightPlayer mount. Mobile browsers only unlock audio after a user gesture;
 * by sharing the context, the first tap (e.g. MULTIPLAYER's "TAP TO FIGHT") unlocks every later round too.
 */
function getSharedAudioContext(): AudioContext | undefined {
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

/**
 * Client-only. This module (and Phaser) is dynamically imported by FightPlayer inside useEffect.
 */
export function createGame(parent: HTMLElement, result: CombatResult, onComplete: () => void): Phaser.Game {
  const layout = pickLayout(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);
  const context = getSharedAudioContext();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: layout.width,
    height: layout.height,
    backgroundColor: BACKGROUND_COLOR,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: layout.width,
      height: layout.height,
      expandParent: false,
    },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    audio: context ? { context } : undefined,
    scene: [new BootScene(result), new FightScene()],
  });
  game.events.once(FIGHT_COMPLETE_EVENT, onComplete);
  return game;
}
