import type { CharacterDefinition } from "./types";

// Sheet: apps/web/public/assets/fighters/boxer/sheet.png — 12 cols × 256px cells, art faces LEFT.
// Frames: idle 0-9 · jab 10-17 · uppercut 18-25 · block 26-35 · hurt 36-43 · KO 44-51
const KEY = "boxer";

export const BOXER: CharacterDefinition = {
  id: "BOXER",
  name: "BOXER",
  displayName: "IRON FIST",
  assets: {
    spritesheet: "/assets/fighters/boxer/sheet.png",
    frameWidth: 256,
    frameHeight: 256,
    scale: 1.55,
    originY: 1,
    facing: "left",
  },
  moveNames: {
    PUNCH: "JAB",
    BLOCK: "GUARD UP",
    DODGE: "SWAY",
    HEAVY_ATTACK: "HAYMAKER",
    SPECIAL: "POWER PUNCH",
  },
  animations: {
    idle: { key: KEY, frames: { start: 0, end: 9 }, frameRate: 10, repeat: -1 },
    punch: { key: KEY, frames: { start: 10, end: 17 }, frameRate: 18, repeat: 0, impactAtMs: 170, vfx: "spark", sfx: "punch" },
    block: { key: KEY, frames: { start: 26, end: 35 }, frameRate: 14, repeat: 0 },
    heavyAttack: { key: KEY, frames: { start: 18, end: 25 }, frameRate: 12, repeat: 0, impactAtMs: 330, vfx: "bigImpact", sfx: "heavy" },
    special: { key: KEY, frames: { start: 18, end: 25 }, frameRate: 10, repeat: 0, impactAtMs: 400, vfx: "bigImpact", sfx: "heavy" },
    hit: { key: KEY, frames: { start: 36, end: 43 }, frameRate: 16, repeat: 0 },
    ko: { key: KEY, frames: { start: 44, end: 51 }, frameRate: 9, repeat: 0 },
  },
  palette: { primary: 0xff3b3b, glow: 0xffb347 },
};
