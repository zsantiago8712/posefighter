import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import * as Phaser from "phaser";
import { BACKGROUND_COLOR, pickLayout } from "./config";
import { BootScene } from "./scenes/BootScene";
import { FIGHT_COMPLETE_EVENT, FightScene } from "./scenes/FightScene";

/**
 * Client-only. This module (and Phaser) is dynamically imported by FightPlayer inside useEffect.
 */
export function createGame(parent: HTMLElement, result: CombatResult, onComplete: () => void): Phaser.Game {
  const layout = pickLayout(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);
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
    scene: [new BootScene(result), new FightScene()],
  });
  game.events.once(FIGHT_COMPLETE_EVENT, onComplete);
  return game;
}
