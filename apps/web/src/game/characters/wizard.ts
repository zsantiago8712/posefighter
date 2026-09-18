import type { CharacterDefinition } from "./types";

// Sheet: apps/web/public/assets/fighters/wizard/sheet.png — 12 cols × 256px cells, art faces RIGHT.
// Frames: idle 0-12 · cast 13-25 · damage 26-38 · die 39-51
const KEY = "wizard";

export const WIZARD: CharacterDefinition = {
  id: "WIZARD",
  name: "WIZARD",
  displayName: "VOID SAGE",
  assets: {
    spritesheet: "/assets/fighters/wizard/sheet.png",
    frameWidth: 256,
    frameHeight: 256,
    scale: 1.6,
    originY: 1,
    facing: "right",
  },
  moveNames: {
    PUNCH: "ARCANE BOLT",
    BLOCK: "MANA WARD",
    DODGE: "BLINK",
    HEAVY_ATTACK: "METEOR",
    SPECIAL: "FIREBALL",
  },
  animations: {
    idle: { key: KEY, frames: { start: 0, end: 12 }, frameRate: 12, repeat: -1 },
    punch: {
      key: KEY,
      frames: { start: 13, end: 25 },
      frameRate: 22,
      repeat: 0,
      impactAtMs: 350,
      vfx: "spark",
      sfx: "fireball",
      projectile: { key: "orb", speed: 1800, scale: 0.8 },
    },
    heavyAttack: {
      key: KEY,
      frames: { start: 13, end: 25 },
      frameRate: 16,
      repeat: 0,
      impactAtMs: 400,
      vfx: "explosion",
      sfx: "fireball",
      projectile: { key: "meteor", speed: 1600, scale: 1.4, path: "fromAbove" },
    },
    special: {
      key: KEY,
      frames: { start: 13, end: 25 },
      frameRate: 16,
      repeat: 0,
      impactAtMs: 400,
      vfx: "explosion",
      sfx: "fireball",
      projectile: { key: "fireball", speed: 1300, scale: 1.6 },
    },
    hit: { key: KEY, frames: { start: 26, end: 38 }, frameRate: 22, repeat: 0 },
    ko: { key: KEY, frames: { start: 39, end: 51 }, frameRate: 12, repeat: 0 },
  },
  palette: { primary: 0xa855f7, glow: 0xffa629 },
};
