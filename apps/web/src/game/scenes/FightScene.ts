import type { CombatPlayerResult, CombatResult, Move } from "@posefighter/backend/convex/shared/contracts";
import * as Phaser from "phaser";
import { playSfx, type SfxKey } from "../audio/sfx";
import { type AnimationDefinition, type AnimationName, getCharacter } from "../characters";
import { buildSequence } from "../choreography/buildSequence";
import { type FightStep, type Side, TIMING, otherSide } from "../choreography/steps";
import { type Layout, layoutOf } from "../config";
import { FighterActor } from "../entities/FighterActor";
import { Banner } from "../ui/Banner";
import { damageNumber } from "../ui/DamageNumber";
import { HealthBar } from "../ui/HealthBar";
import {
  DEPTH,
  burst,
  confetti,
  explosion,
  fireProjectile,
  flash,
  focusCamera,
  generateRuntimeTextures,
  hitStop,
  impactRing,
  resetCamera,
  shake,
  slowMo,
  zoomPunch,
} from "../vfx/effects";

export const FIGHT_COMPLETE_EVENT = "fight:complete";

export interface FightSceneData {
  result: CombatResult;
}

type AttackStep = Extract<FightStep, { kind: "attack" }>;

const MOVE_ANIM: Record<Move, AnimationName> = {
  PUNCH: "punch",
  HEAVY_ATTACK: "heavyAttack",
  SPECIAL: "special",
  BLOCK: "block",
  DODGE: "dodge",
};

/**
 * Generic, data-driven choreography. Reads CharacterDefinitions; contains zero fighter-specific logic.
 */
export class FightScene extends Phaser.Scene {
  static readonly KEY = "Fight";

  private result!: CombatResult;
  private actors!: Record<Side, FighterActor>;
  private bars!: Record<Side, HealthBar>;
  private banner!: Banner;
  private layout!: Layout;
  private alive = false;

  constructor() {
    super(FightScene.KEY);
  }

  init(data: FightSceneData): void {
    this.result = data.result;
  }

  create(): void {
    this.alive = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
    });
    generateRuntimeTextures(this);
    this.layout = layoutOf(this);
    const L = this.layout;
    this.drawArena();

    const { player1, player2 } = this.result;
    const def1 = getCharacter(player1.fighter);
    const def2 = getCharacter(player2.fighter);
    this.actors = {
      p1: new FighterActor(this, def1, "p1", L.p1X, L.groundY, L.fighterScale),
      p2: new FighterActor(this, def2, "p2", L.p2X, L.groundY, L.fighterScale),
    };
    this.bars = {
      p1: new HealthBar(this, 24, L.barY, false, player1.nickname, def1.displayName, def1.palette.primary, player1.hpBefore),
      p2: new HealthBar(this, L.width - 24, L.barY, true, player2.nickname, def2.displayName, def2.palette.primary, player2.hpBefore),
    };
    this.add.text(L.width / 2, L.barY + 22, "VS", { fontFamily: '"Bangers", Impact, sans-serif', fontSize: "44px", color: "#ffd93b", stroke: "#000", strokeThickness: 6 })
      .setOrigin(0.5).setDepth(DEPTH.ui).setAngle(-8);
    this.banner = new Banner(this);

    void this.run();
  }

  // --- sequencing -----------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private realDelay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private player(side: Side): CombatPlayerResult {
    return side === "p1" ? this.result.player1 : this.result.player2;
  }

  private async run(): Promise<void> {
    const steps = buildSequence(this.result);
    for (const step of steps) {
      if (!this.alive) return;
      await this.runStep(step);
    }
    if (!this.alive) return;
    await this.delay(TIMING.resolve);
    resetCamera(this);
    // contract guarantee: bars end exactly at hpAfter no matter what the choreography did
    this.bars.p1.setHp(this.result.player1.hpAfter, 200);
    this.bars.p2.setHp(this.result.player2.hpAfter, 200);
    await this.delay(250);
    if (this.alive) this.game.events.emit(FIGHT_COMPLETE_EVENT);
  }

  private async runStep(step: FightStep): Promise<void> {
    switch (step.kind) {
      case "banner":
        playSfx(this, "sting", 0.5, step.text === "FIGHT!" ? 1.2 : 0.9);
        await this.banner.show(step.text, { color: step.color, hold: step.hold });
        return;
      case "wait":
        await this.delay(step.ms);
        return;
      case "attack":
        await this.attack(step);
        return;
      case "clash":
        await this.clash(step.damageP1, step.damageP2);
        return;
      case "defend":
        await this.defend(step.side, step.move);
        return;
      case "ko":
        await this.ko(step.loser);
        return;
      case "victory":
        await this.victory(step.winner);
        return;
    }
  }

  // --- steps ----------------------------------------------------------------

  private async attack(step: AttackStep): Promise<void> {
    const atk = this.actors[step.attacker];
    const def = this.actors[otherSide(step.attacker)];
    const animName = MOVE_ANIM[step.move];
    const a: AnimationDefinition = atk.getDef(animName) ?? atk.getDef("punch") ?? atk.def.animations.idle;
    const heavy = step.move !== "PUNCH";

    // anticipation: glow + move name
    atk.flashTint(atk.def.palette.glow, 140);
    this.banner.caption(atk.x, this.layout.groundY - atk.height - 40, atk.def.moveNames[step.move], "#ffffff");
    if (heavy) {
      burst(this, atk.chest.x, atk.chest.y, atk.def.palette.glow, 12, 250);
    }
    await this.delay(TIMING.anticipation);
    if (!this.alive) return;

    if (a.projectile) {
      const duration = atk.play(animName);
      playSfx(this, a.sfx as SfxKey | undefined, 0.5);
      await this.delay(a.impactAtMs ?? duration * 0.5);
      if (!this.alive) return;
      const from = a.projectile.path === "fromAbove" ? { x: def.x + def.dir * 40, y: -120 } : atk.hand;
      const to = a.projectile.path === "fromAbove" ? { x: def.x, y: def.chest.y + 40 } : def.chest;
      const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const travelMs = Math.max(120, (dist / a.projectile.speed) * 1000);
      this.time.delayedCall(Math.max(0, travelMs - 140), () => this.beginDefense(def, step));
      await fireProjectile(this, a.projectile.key, from, to, a.projectile.speed, a.projectile.scale ?? 1, atk.def.palette.glow);
      if (!this.alive) return;
      this.resolveImpact(atk, def, step, a, heavy);
      await this.delay(TIMING.outcomeBanner);
      return;
    }

    // melee: dash in, swing, impact, return
    const reachX = def.x - atk.dir * (def.width * 0.5 + atk.width * 0.45);
    playSfx(this, "whoosh", 0.4);
    await atk.dashTo(reachX, TIMING.dash);
    if (!this.alive) return;
    const duration = atk.play(animName, heavy ? 0.9 : 1);
    const impactAt = Math.min(a.impactAtMs ?? duration * 0.5, duration || 400);
    const preReact = Math.max(0, impactAt - 120);
    await this.delay(preReact);
    if (!this.alive) return;
    this.beginDefense(def, step);
    await this.delay(impactAt - preReact);
    if (!this.alive) return;
    this.resolveImpact(atk, def, step, a, heavy);
    await this.delay(Math.max(150, duration - impactAt));
    if (!this.alive) return;
    if (!step.lethal) {
      await atk.moveTo(atk.homeX, TIMING.returnHome);
    } else {
      await this.delay(TIMING.outcomeBanner);
    }
  }

  /** Defender starts blocking/dodging a beat before the hit connects. */
  private beginDefense(def: FighterActor, step: AttackStep): void {
    if (step.reaction === "block") {
      def.play("block");
      this.showShield(def);
    } else if (step.reaction === "dodge") {
      void def.dodge();
    }
  }

  private showShield(def: FighterActor): void {
    if (!this.textures.exists("shield")) return;
    const s = this.add
      .image(def.chest.x + def.dir * 30, def.chest.y, "shield")
      .setDepth(DEPTH.vfx)
      .setTint(def.def.palette.primary)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2)
      .setAlpha(0.9);
    this.tweens.add({ targets: s, scale: 1.1, duration: 160, ease: "Back.easeOut" });
    this.tweens.add({ targets: s, angle: 40, alpha: 0, delay: 420, duration: 320, onComplete: () => s.destroy() });
  }

  private resolveImpact(atk: FighterActor, def: FighterActor, step: AttackStep, a: AnimationDefinition, heavy: boolean): void {
    const point = { x: def.chest.x + def.dir * def.width * 0.3, y: def.chest.y };
    const glow = atk.def.palette.glow;
    const defender = this.player(def.side);

    if (step.reaction === "hit") {
      const lethal = step.lethal;
      hitStop(this, lethal ? 220 : heavy ? TIMING.hitStopHeavy : TIMING.hitStopLight);
      shake(this, lethal ? 0.035 : heavy ? 0.02 : 0.008, lethal ? 450 : heavy ? 300 : 180);
      flash(this, heavy ? glow : 0xffffff, lethal ? 0.95 : heavy ? 0.85 : 0.5, heavy ? 160 : 110);
      if (heavy) zoomPunch(this, lethal ? 1.12 : 1.07, 90);
      this.impactVfx(a.vfx, point, glow, heavy ? 1.4 : 1);
      playSfx(this, heavy ? (a.vfx === "explosion" ? "explosion" : "heavy") : "punch", 0.7);
      def.play("hit");
      def.flashTint(0xff2020, 160);
      def.knockback(heavy ? 70 : 35);
      damageNumber(this, point.x, point.y - 60, step.damage, heavy ? "heavy" : "hit");
      this.bars[def.side].setHp(defender.hpAfter, TIMING.hpDrain);
      return;
    }

    if (step.reaction === "block") {
      hitStop(this, 50);
      shake(this, 0.005, 140);
      impactRing(this, point.x, point.y, def.def.palette.primary, 0.8);
      burst(this, point.x, point.y, def.def.palette.primary, 10, 350);
      playSfx(this, "block", 0.7);
      def.knockback(18, 120);
      if (step.damage > 0) {
        damageNumber(this, point.x, point.y - 60, step.damage, "blocked");
        this.bars[def.side].setHp(defender.hpAfter, TIMING.hpDrain);
      }
      return;
    }

    // dodge: whiff
    impactRing(this, point.x - def.dir * 60, point.y, 0x888888, 0.5);
    playSfx(this, "dodge", 0.6);
    if (step.damage > 0) {
      damageNumber(this, point.x, point.y - 60, step.damage, "graze");
      this.bars[def.side].setHp(defender.hpAfter, TIMING.hpDrain);
    } else {
      damageNumber(this, point.x, point.y - 60, "MISS", "miss");
    }
  }

  private impactVfx(preset: string | undefined, point: { x: number; y: number }, color: number, size: number): void {
    switch (preset) {
      case "explosion":
        explosion(this, point.x, point.y, color, size);
        burst(this, point.x, point.y, color, 36, 700);
        return;
      case "bigImpact":
        impactRing(this, point.x, point.y, color, 1.8 * size);
        burst(this, point.x, point.y, color, 30, 650);
        return;
      case "slash": {
        impactRing(this, point.x, point.y, color, size);
        burst(this, point.x, point.y, 0xffffff, 16, 600);
        const g = this.add.graphics().setDepth(DEPTH.vfx);
        g.lineStyle(14, 0xffffff, 1);
        g.lineBetween(point.x - 110, point.y + 90, point.x + 110, point.y - 90);
        g.lineStyle(6, color, 1);
        g.lineBetween(point.x - 120, point.y + 100, point.x + 120, point.y - 100);
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        return;
      }
      default:
        impactRing(this, point.x, point.y, color, size);
        burst(this, point.x, point.y, color, 16, 500);
    }
  }

  private async clash(damageP1: number, damageP2: number): Promise<void> {
    const { p1, p2 } = this.actors;
    const centerX = this.layout.width / 2;
    const gap = (p1.width + p2.width) * 0.28;
    this.banner.caption(p1.x, this.layout.groundY - p1.height - 40, p1.def.moveNames[this.result.player1.move], "#ffffff");
    this.banner.caption(p2.x, this.layout.groundY - p2.height - 40, p2.def.moveNames[this.result.player2.move], "#ffffff");
    await this.delay(TIMING.anticipation);
    if (!this.alive) return;
    playSfx(this, "whoosh", 0.5);
    await Promise.all([p1.dashTo(centerX - gap, TIMING.dash), p2.dashTo(centerX + gap, TIMING.dash)]);
    if (!this.alive) return;
    const a1 = p1.getDef(MOVE_ANIM[this.result.player1.move]);
    const d1 = p1.play(MOVE_ANIM[this.result.player1.move]);
    p2.play(MOVE_ANIM[this.result.player2.move]);
    await this.delay(Math.min(a1?.impactAtMs ?? 200, d1 || 200));
    if (!this.alive) return;

    const point = { x: centerX, y: Math.min(p1.chest.y, p2.chest.y) };
    hitStop(this, TIMING.hitStopHeavy);
    shake(this, 0.02, 320);
    flash(this, 0xffd93b, 0.85, 150);
    zoomPunch(this, 1.07, 90);
    impactRing(this, point.x, point.y, 0xffd93b, 2);
    burst(this, point.x, point.y, 0xffd93b, 40, 750);
    playSfx(this, "heavy", 0.7);
    for (const actor of [p1, p2]) {
      actor.knockback(50);
      actor.flashTint(0xffffff, 120);
    }
    await this.delay(220);
    if (!this.alive) return;
    p1.play("hit");
    p2.play("hit");
    damageNumber(this, p1.chest.x - 40, p1.chest.y - 80, damageP1, "hit");
    damageNumber(this, p2.chest.x + 40, p2.chest.y - 80, damageP2, "hit");
    this.bars.p1.setHp(this.result.player1.hpAfter, TIMING.hpDrain);
    this.bars.p2.setHp(this.result.player2.hpAfter, TIMING.hpDrain);
    await this.delay(450);
    if (!this.alive) return;
    await Promise.all([p1.moveTo(p1.homeX, TIMING.returnHome), p2.moveTo(p2.homeX, TIMING.returnHome)]);
  }

  private async defend(side: Side, move: Move): Promise<void> {
    const actor = this.actors[side];
    this.banner.caption(actor.x, this.layout.groundY - actor.height - 40, actor.def.moveNames[move], "#cfcfcf");
    if (move === "BLOCK") {
      actor.play("block");
      this.showShield(actor);
      playSfx(this, "block", 0.3, 0.8);
      await this.delay(650);
    } else if (move === "DODGE") {
      playSfx(this, "dodge", 0.4);
      await actor.dodge();
    } else {
      // an attack that hit nothing
      actor.play(MOVE_ANIM[move]);
      await this.delay(600);
    }
  }

  private async ko(loser: Side): Promise<void> {
    const actor = this.actors[loser];
    slowMo(this, 0.25, TIMING.koSlowMo);
    focusCamera(this, actor.x, actor.chest.y, 1.12, 120);
    actor.play("ko");
    flash(this, 0xff2020, 0.6, 400);
    playSfx(this, "ko", 0.8);
    await this.realDelay(TIMING.koSlowMo);
    if (!this.alive) return;
    resetCamera(this, 350);
    await this.banner.show("K.O.!", { color: "#ff3b3b", size: 220, hold: 700 });
  }

  private async victory(winner: Side): Promise<void> {
    const actor = this.actors[winner];
    actor.play("victory");
    confetti(this, actor.def.palette.primary);
    await this.banner.show(`${this.player(winner).nickname.toUpperCase()} WINS`, { color: "#ffd93b", size: 84, hold: 900, y: this.layout.height * 0.3 });
  }

  // --- arena ----------------------------------------------------------------

  /** Raised fighting stage so the characters visibly stand on something. */
  private drawStage(g: Phaser.GameObjects.Graphics): void {
    const { width: W, groundY: G } = this.layout;
    const inset = W * 0.06;
    const topH = 26;
    const frontH = 46;
    // front face (darker, slightly wider at the bottom = perspective)
    g.fillStyle(0x1a0f33, 1);
    g.fillPoints(
      [
        { x: inset, y: G + topH },
        { x: W - inset, y: G + topH },
        { x: W - inset * 0.6, y: G + topH + frontH },
        { x: inset * 0.6, y: G + topH + frontH },
      ],
      true,
    );
    // top face
    g.fillStyle(0x2b1a55, 1);
    g.fillRoundedRect(inset, G - 4, W - inset * 2, topH + 4, 6);
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(inset + 8, G - 2, W - inset * 2 - 16, 6);
    // neon rims
    g.lineStyle(5, 0xff2bd6, 1);
    g.strokeRoundedRect(inset, G - 4, W - inset * 2, topH + 4, 6);
    g.lineStyle(3, 0x9ad0ff, 0.5);
    g.lineBetween(inset * 0.6, G + topH + frontH, W - inset * 0.6, G + topH + frontH);
    // center mark
    g.lineStyle(3, 0xffd93b, 0.5);
    g.lineBetween(W / 2, G - 2, W / 2, G + topH);
  }

  private drawArena(): void {
    const { width: W, height: H, groundY: G } = this.layout;
    const g = this.add.graphics().setDepth(DEPTH.bg);
    g.fillGradientStyle(0x120826, 0x120826, 0x4a1170, 0x4a1170, 1);
    g.fillRect(0, 0, W, G);
    // horizon glow
    g.fillGradientStyle(0x4a1170, 0x4a1170, 0xff2bd6, 0xff2bd6, 0, 0, 0.55, 0.55);
    g.fillRect(0, G - 260, W, 260);
    // light beams
    const beams = Math.round(W / 150);
    for (let i = 0; i < beams; i++) {
      const x = 60 + i * 150;
      g.fillStyle(0xffffff, 0.05);
      g.fillTriangle(x, 0, x + 40, 0, x + 200, G);
    }
    // floor
    g.fillStyle(0x0b0713, 1);
    g.fillRect(0, G, W, H - G);
    g.lineStyle(6, 0xff2bd6, 1);
    g.lineBetween(0, G, W, G);
    this.drawStage(g);
    g.lineStyle(2, 0xff2bd6, 0.35);
    for (let i = 1; i < 8; i++) {
      const y = G + i * i * 6;
      if (y < H) g.lineBetween(0, y, W, y);
    }
    const spokes = Math.round(W / 60);
    for (let i = -spokes; i <= spokes; i++) {
      g.lineBetween(W / 2 + i * 60, G, W / 2 + i * 260, H);
    }
    // drifting embers
    if (this.textures.exists("particle")) {
      this.add.particles(0, 0, "particle", {
        x: { min: 0, max: W },
        y: { min: H * 0.15, max: G },
        speedY: { min: -30, max: -10 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 3000,
        frequency: 120,
        tint: [0xff2bd6, 0xffd93b, 0x9ad0ff],
      }).setDepth(DEPTH.bg + 1);
    }
  }
}
