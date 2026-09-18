import * as Phaser from "phaser";
import { MAX_HP } from "@posefighter/backend/convex/shared/contracts";
import { DEPTH } from "../vfx/effects";
import { arcadeText } from "./text";

const BAR_W = 300;
const BAR_H = 34;

/** Chunky arcade health bar. P1 drains right→left, P2 mirrored. */
export class HealthBar {
  readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly ghost: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private hp: number;
  private lowTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly mirrored: boolean,
    name: string,
    subtitle: string,
    color: number,
    hp: number,
  ) {
    this.hp = Phaser.Math.Clamp(hp, 0, MAX_HP);
    const dir = mirrored ? -1 : 1;
    this.container = scene.add.container(x, y).setDepth(DEPTH.ui).setScrollFactor(0);

    const bg = scene.add.rectangle(0, 0, BAR_W, BAR_H, 0x111111, 0.9).setOrigin(mirrored ? 1 : 0, 0);
    this.ghost = scene.add.rectangle(0, 0, BAR_W, BAR_H, 0xffffff, 1).setOrigin(mirrored ? 1 : 0, 0);
    this.fill = scene.add.rectangle(0, 0, BAR_W, BAR_H, color, 1).setOrigin(mirrored ? 1 : 0, 0);
    this.frame = scene.add.rectangle(0, 0, BAR_W, BAR_H).setOrigin(mirrored ? 1 : 0, 0).setStrokeStyle(4, 0xffffff, 1);

    const nameText = scene.add.text(0, -8, name.toUpperCase(), arcadeText(34)).setOrigin(mirrored ? 1 : 0, 1);
    const subText = scene.add.text(dir * 4, BAR_H + 4, subtitle, { ...arcadeText(20, "#cfcfcf", 3) }).setOrigin(mirrored ? 1 : 0, 0);
    this.hpText = scene.add.text(dir * (BAR_W - 8), BAR_H / 2, `${this.hp}`, arcadeText(24)).setOrigin(mirrored ? 0 : 1, 0.5);

    this.container.add([bg, this.ghost, this.fill, this.frame, nameText, subText, this.hpText]);
    this.applyWidth(this.fill, this.hp);
    this.applyWidth(this.ghost, this.hp);
    this.updateLow();
  }

  private applyWidth(rect: Phaser.GameObjects.Rectangle, hp: number): void {
    // setSize (not .width) so the Shape geometry actually redraws; origin keeps the outer edge fixed
    rect.setSize(Math.max(0, (hp / MAX_HP) * BAR_W), BAR_H);
    rect.setOrigin(this.mirrored ? 1 : 0, 0);
  }

  /** Eased drain to `hp` with a white ghost showing the lost chunk. */
  setHp(hp: number, duration = 450): void {
    const target = Phaser.Math.Clamp(hp, 0, MAX_HP);
    if (target === this.hp) return;
    const from = this.hp;
    this.hp = target;
    const proxy = { v: from };
    this.scene.tweens.add({
      targets: proxy,
      v: target,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.applyWidth(this.fill, proxy.v);
        this.hpText.setText(`${Math.round(proxy.v)}`);
      },
      onComplete: () => {
        this.hpText.setText(`${target}`);
        this.updateLow();
      },
    });
    this.scene.tweens.add({
      targets: { v: from },
      v: target,
      duration: duration * 1.8,
      delay: 250,
      ease: "Quad.easeIn",
      onUpdate: (tween) => this.applyWidth(this.ghost, (tween.targets[0] as { v: number }).v),
    });
    this.scene.tweens.add({ targets: this.frame, scaleY: 1.25, yoyo: true, duration: 90 });
  }

  private updateLow(): void {
    const low = this.hp > 0 && this.hp / MAX_HP < 0.3;
    if (low && !this.lowTween) {
      this.lowTween = this.scene.tweens.add({ targets: this.fill, alpha: 0.35, yoyo: true, repeat: -1, duration: 260 });
    } else if (!low && this.lowTween) {
      this.lowTween.stop();
      this.lowTween = undefined;
      this.fill.setAlpha(1);
    }
  }
}
