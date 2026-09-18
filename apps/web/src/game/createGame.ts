import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import * as Phaser from "phaser";
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from "./config";
import { BootScene } from "./scenes/BootScene";
import { FIGHT_COMPLETE_EVENT, FightScene } from "./scenes/FightScene";

/**
 * Client-only. This module (and Phaser) is dynamically imported by FightPlayer inside useEffect.
 */
export function createGame(parent: HTMLElement, result: CombatResult, onComplete: () => void): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      expandParent: false,
    },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scene: [new BootScene(result), new FightScene()],
  });
  game.events.once(FIGHT_COMPLETE_EVENT, onComplete);
  return game;
}
