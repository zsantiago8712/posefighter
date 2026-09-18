import * as Phaser from "phaser";
import { DEPTH } from "../vfx/effects";
import { arcadeText } from "./text";

export type DamageKind = "hit" | "heavy" | "blocked" | "miss" | "graze";

const COLORS: Record<DamageKind, string> = {
  hit: "#ff3b3b",
  heavy: "#ff8a1f",
  blocked: "#4da3ff",
  miss: "#bdbdbd",
  graze: "#e0e0e0",
};

export function damageNumber(scene: Phaser.Scene, x: number, y: number, value: number | string, kind: DamageKind): void {
  const label = typeof value === "number" ? (kind === "blocked" ? `-${value} CHIP` : `-${value}`) : value;
  const size = kind === "heavy" ? 110 : kind === "hit" ? 88 : kind === "blocked" ? 56 : 64;
  // keep big numbers fully on the canvas when the defender stands near an edge
  x = Phaser.Math.Clamp(x, size, scene.scale.width - size);
  const t = scene.add.text(x, y, label, arcadeText(size, COLORS[kind])).setOrigin(0.5).setDepth(DEPTH.banner).setScale(0.3).setAngle(kind === "heavy" ? -8 : 0);
  scene.tweens.add({ targets: t, scale: 1, y: y - 120, duration: 260, ease: "Back.easeOut" });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 200, delay: 520, duration: 320, ease: "Quad.easeIn", onComplete: () => t.destroy() });
}
