import * as Phaser from "phaser";
import type { AnimationDefinition, AnimationName, CharacterDefinition } from "../characters";
import type { Side } from "../choreography/steps";
import { arcadeText } from "../ui/text";
import { DEPTH } from "../vfx/effects";

const PLACEHOLDER_W = 200;
const PLACEHOLDER_H = 340;

/**
 * One fighter on screen. Wraps either a spritesheet sprite or a colored placeholder and exposes
 * the same API for both, so FightScene never cares which one it got.
 */
export class FighterActor {
  readonly container: Phaser.GameObjects.Container;
  readonly sprite?: Phaser.GameObjects.Sprite;
  readonly placeholder?: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  /** resting scale of the sprite/placeholder, restored whenever we go back to idle */
  private baseScale = { x: 1, y: 1 };
  readonly homeX: number;
  /** +1 faces right (P1), -1 faces left (P2) */
  readonly dir: 1 | -1;
  private idleTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: CharacterDefinition,
    readonly side: Side,
    x: number,
    readonly groundY: number,
    scaleMultiplier = 1,
  ) {
    this.dir = side === "p1" ? 1 : -1;
    this.homeX = x;
    this.container = scene.add.container(x, groundY).setDepth(DEPTH.fighters);
    // drop shadow grounds the sprite on the stage
    this.shadow = scene.add.ellipse(0, 4, 160, 40, 0x000000, 0.45);
    this.container.add(this.shadow);

    const textureKey = def.animations.idle.key;
    if (scene.textures.exists(textureKey)) {
      const scale = (def.assets.scale ?? 1) * scaleMultiplier;
      this.sprite = scene.add
        .sprite(0, (def.assets.footOffset ?? 0) * scale, textureKey, 0)
        .setOrigin(0.5, def.assets.originY ?? 1)
        .setScale(scale);
      const artFacesRight = (def.assets.facing ?? "right") === "right";
      this.sprite.setFlipX(artFacesRight !== (this.dir === 1));
      if (def.assets.tint !== undefined) this.sprite.setTint(def.assets.tint);
      this.container.add(this.sprite);
      this.registerAnimations();
    } else {
      this.placeholder = scene.add
        .rectangle(0, 0, PLACEHOLDER_W, PLACEHOLDER_H, def.palette.primary)
        .setOrigin(0.5, 1)
        .setStrokeStyle(6, 0xffffff)
        .setScale(scaleMultiplier);
      const label = scene.add.text(0, -PLACEHOLDER_H / 2, def.name, arcadeText(40)).setOrigin(0.5);
      const eye = scene.add.circle(this.dir * 55, -PLACEHOLDER_H + 70, 14, 0xffffff);
      this.container.add([this.placeholder, label, eye]);
    }
    this.shadow.setSize(this.width * 1.15, Math.max(24, this.width * 0.26));
    const body = this.sprite ?? this.placeholder;
    if (body) this.baseScale = { x: body.scaleX, y: body.scaleY };
    this.playIdle();
  }

  // --- geometry -------------------------------------------------------------

  get x(): number {
    return this.container.x;
  }

  /** visual body width (approx, for spacing) */
  get width(): number {
    return this.sprite ? this.sprite.displayWidth * 0.45 : PLACEHOLDER_W;
  }

  get height(): number {
    return this.sprite ? this.sprite.displayHeight * 0.85 : PLACEHOLDER_H;
  }

  /** where hits land */
  get chest(): { x: number; y: number } {
    return { x: this.x, y: this.groundY - this.height * 0.55 };
  }

  /** where projectiles/fists come out */
  get hand(): { x: number; y: number } {
    return { x: this.x + this.dir * this.width * 0.55, y: this.groundY - this.height * 0.5 };
  }

  // --- animations -----------------------------------------------------------

  private animKey(name: AnimationName): string {
    return `${this.def.id}:${name}`;
  }

  private registerAnimations(): void {
    for (const [name, a] of Object.entries(this.def.animations) as [AnimationName, AnimationDefinition | undefined][]) {
      if (!a || !this.scene.textures.exists(a.key) || this.scene.anims.exists(this.animKey(name))) continue;
      const frames = Array.isArray(a.frames)
        ? this.scene.anims.generateFrameNumbers(a.key, { frames: a.frames })
        : this.scene.anims.generateFrameNumbers(a.key, a.frames ?? { start: 0, end: 0 });
      this.scene.anims.create({ key: this.animKey(name), frames, frameRate: a.frameRate ?? 12, repeat: a.repeat ?? 0 });
    }
  }

  hasAnim(name: AnimationName): boolean {
    return !!this.sprite && this.scene.anims.exists(this.animKey(name));
  }

  getDef(name: AnimationName): AnimationDefinition | undefined {
    return this.def.animations[name];
  }

  /**
   * Plays an animation (sprite frames or placeholder tween). Returns the duration in ms (0 for loops).
   * `hold` keeps the final pose (e.g. guard up) until playIdle() is called explicitly.
   */
  play(name: AnimationName, rateScale = 1, hold = false): number {
    this.stopIdleTween();
    this.resetPose();
    if (this.sprite && this.hasAnim(name)) {
      const anim = this.scene.anims.get(this.animKey(name));
      const frameRate = anim.frameRate * rateScale;
      this.sprite.play({ key: anim.key, frameRate });
      if (anim.repeat === -1) return 0;
      const duration = (anim.frames.length / frameRate) * 1000;
      if (name !== "ko" && !hold) {
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.playIdle());
      }
      return duration;
    }
    return this.fallbackAnim(name, hold);
  }

  /** Undo leftovers from tween-based fallbacks (squash, fade, tilt) — never after a KO. */
  private resetPose(): void {
    const target = this.sprite ?? this.placeholder;
    if (!target) return;
    this.scene.tweens.killTweensOf(target);
    target.setScale(this.baseScale.x, this.baseScale.y).setAlpha(1).setAngle(0);
    if (this.sprite) this.sprite.setPosition(0, (this.def.assets.footOffset ?? 0) * this.baseScale.x);
    else target.setPosition(0, 0);
  }

  playIdle(): void {
    this.resetPose();
    if (this.sprite && this.hasAnim("idle")) {
      this.sprite.play(this.animKey("idle"), true);
      return;
    }
    this.stopIdleTween();
    const target = this.sprite ?? this.placeholder;
    if (!target) return;
    this.idleTween = this.scene.tweens.add({
      targets: target,
      scaleY: target.scaleY * 1.03,
      scaleX: target.scaleX * 0.98,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private stopIdleTween(): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = undefined;
    }
  }

  /** Tween-based stand-ins for missing frames. Works on both the sprite and the placeholder. */
  private fallbackAnim(name: AnimationName, hold = false): number {
    const target = this.sprite ?? this.placeholder;
    if (!target) return 300;
    const baseScaleX = this.baseScale.x;
    const baseScaleY = this.baseScale.y;
    const done = (ms: number) => {
      this.scene.time.delayedCall(ms, () => {
        if (name !== "ko" && !hold) this.playIdle();
      });
      return ms;
    };
    switch (name) {
      case "idle":
        this.playIdle();
        return 0;
      case "punch":
        this.scene.tweens.add({ targets: target, x: this.dir * 45, duration: 110, yoyo: true, ease: "Quad.easeOut" });
        return done(240);
      case "heavyAttack":
      case "special":
        this.scene.tweens.add({ targets: target, scaleX: baseScaleX * 1.18, scaleY: baseScaleY * 0.92, duration: 180, yoyo: true, ease: "Quad.easeOut" });
        this.scene.tweens.add({ targets: target, x: this.dir * 60, duration: 180, delay: 100, yoyo: true, ease: "Quad.easeOut" });
        return done(460);
      case "block":
        // crouch into the guard; when holding, stay there until playIdle()
        this.scene.tweens.add({ targets: target, scaleX: baseScaleX * 0.88, scaleY: baseScaleY * 0.94, duration: 120, yoyo: !hold, hold: hold ? 0 : 420 });
        return done(680);
      case "dodge":
        this.scene.tweens.add({ targets: target, alpha: 0.35, duration: 120, yoyo: true, hold: 300 });
        return done(560);
      case "hit":
        this.scene.tweens.add({ targets: target, angle: -this.dir * 14, duration: 90, yoyo: true, hold: 120 });
        return done(320);
      case "ko":
        this.scene.tweens.add({ targets: target, angle: -this.dir * 90, y: 20, alpha: 0.85, duration: 650, ease: "Bounce.easeOut" });
        return 700;
      case "victory":
        this.scene.tweens.add({ targets: target, y: -70, duration: 220, yoyo: true, repeat: 2, ease: "Quad.easeOut" });
        return done(1320);
    }
  }

  // --- reactions -----------------------------------------------------------

  flashTint(color: number, ms = 150): void {
    if (this.sprite) {
      this.sprite.setTintFill(color);
      this.scene.time.delayedCall(ms, () => {
        if (!this.sprite || !this.sprite.active) return;
        if (this.def.assets.tint !== undefined) this.sprite.setTint(this.def.assets.tint);
        else this.sprite.clearTint();
      });
    } else if (this.placeholder) {
      this.placeholder.setFillStyle(color);
      this.scene.time.delayedCall(ms, () => this.placeholder?.setFillStyle(this.def.palette.primary));
    }
  }

  knockback(distance: number, ms = 160): void {
    this.scene.tweens.add({ targets: this.container, x: this.x - this.dir * distance, duration: ms, yoyo: true, ease: "Quad.easeOut" });
  }

  /** Afterimage at the current pose. */
  ghost(alpha = 0.5, duration = 280): void {
    let g: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
    if (this.sprite) {
      g = this.scene.add
        .sprite(this.x, this.groundY, this.sprite.texture.key, this.sprite.frame.name)
        .setOrigin(this.sprite.originX, this.sprite.originY)
        .setScale(this.sprite.scaleX, this.sprite.scaleY)
        .setFlipX(this.sprite.flipX)
        .setTintFill(this.def.palette.glow);
    } else {
      g = this.scene.add.rectangle(this.x, this.groundY, PLACEHOLDER_W, PLACEHOLDER_H, this.def.palette.glow).setOrigin(0.5, 1);
    }
    g.setDepth(DEPTH.fighters - 1).setAlpha(alpha);
    this.scene.tweens.add({ targets: g, alpha: 0, duration, onComplete: () => g.destroy() });
  }

  // --- movement -------------------------------------------------------------

  moveTo(x: number, ms: number, ease = "Quad.easeInOut"): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this.container, x, duration: ms, ease, onComplete: () => resolve() });
    });
  }

  /** Fast move with a motion trail. */
  dashTo(x: number, ms: number): Promise<void> {
    const trail = this.scene.time.addEvent({ delay: 55, repeat: Math.floor(ms / 55), callback: () => this.ghost(0.45) });
    return this.moveTo(x, ms, "Quad.easeOut").then(() => trail.remove());
  }

  /** Dodge: hop back with ghosts, then return. Resolves when back home. */
  async dodge(): Promise<void> {
    this.play("dodge");
    const away = this.homeX - this.dir * 110;
    await this.dashTo(away, 180);
    await new Promise<void>((r) => this.scene.time.delayedCall(220, () => r()));
    await this.moveTo(this.homeX, 220);
  }
}
