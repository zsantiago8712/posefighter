import type { CharacterDefinition } from "./types";

// Sheet: apps/web/public/assets/fighters/samurai/sheet.png — 12 cols × 256px cells, art faces LEFT.
// Frames: idle 0-9 · quick slash 10-17 · heavy slash 18-25 · back-off 26-35 · hurt 36-41 · dead 42-49
const KEY = "samurai";

export const SAMURAI: CharacterDefinition = {
  id: "SAMURAI",
  name: "SAMURAI",
  displayName: "BLADE STORM",
  assets: {
    spritesheet: "/assets/fighters/samurai/sheet.png",
    frameWidth: 256,
    frameHeight: 256,
    scale: 1.55,
    originY: 1,
    facing: "left",
  },
  moveNames: {
    PUNCH: "QUICK SLASH",
    BLOCK: "PARRY",
    DODGE: "SIDESTEP",
    HEAVY_ATTACK: "HEAVY CLEAVE",
    SPECIAL: "ENERGY SLASH",
  },
  animations: {
    idle: { key: KEY, frames: { start: 0, end: 9 }, frameRate: 10, repeat: -1 },
    punch: { key: KEY, frames: { start: 10, end: 17 }, frameRate: 20, repeat: 0, impactAtMs: 200, vfx: "slash", sfx: "punch" },
    dodge: { key: KEY, frames: { start: 26, end: 35 }, frameRate: 18, repeat: 0 },
    heavyAttack: { key: KEY, frames: { start: 18, end: 25 }, frameRate: 12, repeat: 0, impactAtMs: 330, vfx: "slash", sfx: "heavy" },
    special: {
      key: KEY,
      frames: { start: 18, end: 25 },
      frameRate: 14,
      repeat: 0,
      impactAtMs: 300,
      vfx: "slash",
      sfx: "whoosh",
      projectile: { key: "wave", speed: 1500, scale: 1.2 },
    },
    hit: { key: KEY, frames: { start: 36, end: 41 }, frameRate: 14, repeat: 0 },
    ko: { key: KEY, frames: { start: 42, end: 49 }, frameRate: 9, repeat: 0 },
  },
  palette: { primary: 0x3d8bff, glow: 0x9ad0ff },
};
