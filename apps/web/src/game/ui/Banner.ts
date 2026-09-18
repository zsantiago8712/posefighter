import type * as Phaser from "phaser";
import { DEPTH } from "../vfx/effects";
import { arcadeText } from "./text";

/** Huge center-screen text that pops in, holds, and fades. */
export class Banner {
  constructor(private readonly scene: Phaser.Scene) {}

  show(text: string, opts: { color?: string; size?: number; hold?: number; y?: number } = {}): Promise<void> {
    const { width, height } = this.scene.scale;
    const size = opts.size ?? (text.length > 8 ? 96 : 140);
    const t = this.scene.add
      .text(width / 2, opts.y ?? height * 0.42, text, arcadeText(size, opts.color ?? "#ffffff"))
      .setOrigin(0.5)
      .setDepth(DEPTH.banner)
      .setScrollFactor(0)
      .setScale(0.2)
      .setAlpha(0)
      .setAngle(-4);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: t,
        scale: 1,
        alpha: 1,
        duration: 220,
        ease: "Back.easeOut",
        onComplete: () => {
          this.scene.tweens.add({
            targets: t,
            alpha: 0,
            scale: 1.25,
            y: t.y - 30,
            delay: opts.hold ?? 380,
            duration: 200,
            onComplete: () => {
              t.destroy();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Fire-and-forget small caption under the fighters ("JAB", "MANA WARD") */
  caption(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add.text(x, y, text, arcadeText(30, color)).setOrigin(0.5).setDepth(DEPTH.banner).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, y: y - 20, duration: 160, ease: "Quad.easeOut" });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 250, onComplete: () => t.destroy() });
  }
}
