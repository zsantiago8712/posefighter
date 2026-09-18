import type { Move } from "../shared/contracts";

/** Base damage per attacking move. Defensive moves deal nothing. */
export const BASE_DAMAGE: Record<Move, number> = {
  PUNCH: 15,
  HEAVY_ATTACK: 25,
  SPECIAL: 30,
  BLOCK: 0,
  DODGE: 0,
};

export const ATTACKS: ReadonlySet<Move> = new Set<Move>(["PUNCH", "HEAVY_ATTACK", "SPECIAL"]);
export const DEFENSES: ReadonlySet<Move> = new Set<Move>(["BLOCK", "DODGE"]);

export function isAttack(move: Move): boolean {
  return ATTACKS.has(move);
}

/**
 * Fraction of the attacker's base damage that lands against a defensive move.
 *   BLOCK beats PUNCH · DODGE beats HEAVY · HEAVY beats BLOCK · SPECIAL beats DODGE
 */
export const DEFENSE_TABLE: Record<"BLOCK" | "DODGE", Record<"PUNCH" | "HEAVY_ATTACK" | "SPECIAL", number>> = {
  BLOCK: { PUNCH: 0.2, HEAVY_ATTACK: 1.0, SPECIAL: 0.5 },
  DODGE: { PUNCH: 0.5, HEAVY_ATTACK: 0.0, SPECIAL: 1.0 },
};

/** Same attack on both sides: both take this fraction. */
export const CLASH_FRACTION = 0.5;

/** power 0..100 → multiplier 0.85..1.15 */
export function powerMultiplier(power: number): number {
  const p = Math.max(0, Math.min(100, power));
  return 0.85 + 0.3 * (p / 100);
}

export function computeDamage(base: number, fraction: number, power: number): number {
  return Math.round(base * fraction * powerMultiplier(power));
}
