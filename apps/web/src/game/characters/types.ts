import type { Fighter, Move } from "@posefighter/backend/convex/shared/contracts";

/** Animation slots the FightScene knows about. Everything else is data. */
export type AnimationName =
  | "idle"
  | "punch"
  | "block"
  | "dodge"
  | "heavyAttack"
  | "special"
  | "hit"
  | "ko"
  | "victory";

export interface ProjectileDefinition {
  /** runtime-generated texture key: "orb" | "fireball" | "wave" | "meteor" */
  key: string;
  /** px per second */
  speed: number;
  scale?: number;
  /** "fromAbove" drops onto the defender instead of flying across */
  path?: "straight" | "fromAbove";
}

export interface AnimationDefinition {
  /** spritesheet texture key */
  key: string;
  frames?: { start: number; end: number } | number[];
  frameRate?: number;
  /** -1 loop, 0 once */
  repeat?: number;
  /** ms after animation start when the "hit" should register (VFX + shake + HP drain) */
  impactAtMs?: number;
  /** impact VFX preset: "spark" | "bigImpact" | "slash" | "explosion" */
  vfx?: string;
  projectile?: ProjectileDefinition;
  sfx?: string;
}

export interface CharacterDefinition {
  id: Fighter;
  name: string;
  displayName: string;
  assets: {
    portrait?: string;
    spritesheet?: string;
    atlas?: { texture: string; json: string };
    frameWidth?: number;
    frameHeight?: number;
    scale?: number;
    originY?: number;
    tint?: number;
    /** direction the art faces in the source sheet. P1 must face right, so "left" packs get flipped. */
    facing?: "left" | "right";
  };
  moveNames: Record<Move, string>;
  animations: {
    idle: AnimationDefinition;
    punch: AnimationDefinition;
    block?: AnimationDefinition;
    dodge?: AnimationDefinition;
    heavyAttack: AnimationDefinition;
    special: AnimationDefinition;
    hit: AnimationDefinition;
    ko: AnimationDefinition;
    victory?: AnimationDefinition;
  };
  effects?: { punch?: string; heavyAttack?: string; special?: string; impact?: string };
  palette: { primary: number; glow: number };
}
