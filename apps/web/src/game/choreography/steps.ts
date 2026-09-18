import type { Move } from "@posefighter/backend/convex/shared/contracts";

export type Side = "p1" | "p2";

export function otherSide(side: Side): Side {
  return side === "p1" ? "p2" : "p1";
}

export function isAttack(move: Move): boolean {
  return move === "PUNCH" || move === "HEAVY_ATTACK" || move === "SPECIAL";
}

/** How the defender reacts to an incoming attack. */
export type Reaction = "hit" | "block" | "dodge";

export type FightStep =
  | { kind: "banner"; text: string; color?: string; hold?: number }
  | { kind: "wait"; ms: number }
  | {
      kind: "attack";
      attacker: Side;
      move: Move;
      reaction: Reaction;
      /** damage the defender actually took (shown as number, drains bar) */
      damage: number;
      /** last hit of a KO round: slow-mo, ko anim, no return to idle */
      lethal: boolean;
    }
  | { kind: "clash"; move: Move; damageP1: number; damageP2: number }
  | { kind: "defend"; side: Side; move: Move }
  | { kind: "ko"; loser: Side }
  | { kind: "victory"; winner: Side };

export const TIMING = {
  roundBanner: 650,
  fightBanner: 550,
  anticipation: 220,
  dash: 260,
  returnHome: 260,
  hitStopLight: 80,
  hitStopHeavy: 130,
  hpDrain: 450,
  doubleHitGap: 350,
  outcomeBanner: 700,
  koSlowMo: 900,
  resolve: 500,
} as const;
