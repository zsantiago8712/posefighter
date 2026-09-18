import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import * as Phaser from "phaser";
import { loadSfx } from "../audio/sfx";
import { getCharacter } from "../characters";
import { arcadeText } from "../ui/text";
import { generateRuntimeTextures } from "../vfx/effects";
import { FightScene, type FightSceneData } from "./FightScene";

/** Loads only what this round needs; missing files degrade to placeholders instead of failing. */
export class BootScene extends Phaser.Scene {
  static readonly KEY = "Boot";

  constructor(private readonly result: CombatResult) {
    super(BootScene.KEY);
  }

  preload(): void {
    this.add.text(this.scale.width / 2, this.scale.height / 2, "LOADING", arcadeText(64, "#ffffff")).setOrigin(0.5);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[game] asset failed to load, using fallback: ${file.key} (${file.url})`);
    });

    const fighters = new Set([this.result.player1.fighter, this.result.player2.fighter]);
    for (const fighter of fighters) {
      const def = getCharacter(fighter);
      const { spritesheet, frameWidth, frameHeight } = def.assets;
      if (spritesheet && frameWidth && frameHeight) {
        this.load.spritesheet(def.animations.idle.key, spritesheet, { frameWidth, frameHeight });
      } else if (def.assets.atlas) {
        this.load.atlas(def.animations.idle.key, def.assets.atlas.texture, def.assets.atlas.json);
      }
    }
    this.load.spritesheet("explosion", "/assets/vfx/explosion.png", { frameWidth: 100, frameHeight: 100 });
    loadSfx(this.load);
  }

  create(): void {
    generateRuntimeTextures(this);
    if (this.textures.exists("explosion") && !this.anims.exists("vfx-explosion")) {
      this.anims.create({
        key: "vfx-explosion",
        frames: this.anims.generateFrameNumbers("explosion", { start: 0, end: 49 }),
        frameRate: 80,
        repeat: 0,
      });
    }
    const data: FightSceneData = { result: this.result };
    this.scene.start(FightScene.KEY, data);
  }
}
