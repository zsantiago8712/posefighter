import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";

export const FIXTURE_BLOCKED: CombatResult = {
  roundNumber: 1,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "SAMURAI", move: "SPECIAL", power: 91,
             damageReceived: 0, hpBefore: 100, hpAfter: 100, posePhotoUrl: "/assets/debug/pose-p1.jpg" },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "WIZARD", move: "BLOCK", power: 80,
             damageReceived: 15, hpBefore: 100, hpAfter: 85 },
  outcome: "BLOCKED",
};

export const FIXTURE_P2_HIT: CombatResult = {
  roundNumber: 2,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "BOXER", move: "PUNCH", power: 70,
             damageReceived: 0, hpBefore: 85, hpAfter: 85 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "SAMURAI", move: "DODGE", power: 40,
             damageReceived: 7, hpBefore: 100, hpAfter: 93 },
  outcome: "DODGED",
};

export const FIXTURE_DOUBLE_HIT: CombatResult = {
  roundNumber: 3,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "WIZARD", move: "HEAVY_ATTACK", power: 88,
             damageReceived: 27, hpBefore: 85, hpAfter: 58 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "BOXER", move: "SPECIAL", power: 60,
             damageReceived: 21, hpBefore: 93, hpAfter: 72 },
  outcome: "DOUBLE_HIT",
};

export const FIXTURE_CLASH: CombatResult = {
  roundNumber: 4,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "SAMURAI", move: "PUNCH", power: 50,
             damageReceived: 7, hpBefore: 58, hpAfter: 51 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "SAMURAI", move: "PUNCH", power: 55,
             damageReceived: 7, hpBefore: 72, hpAfter: 65 },
  outcome: "CLASH",
};

export const FIXTURE_STALEMATE: CombatResult = {
  roundNumber: 5,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "BOXER", move: "BLOCK", power: 65,
             damageReceived: 0, hpBefore: 51, hpAfter: 51 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "WIZARD", move: "DODGE", power: 70,
             damageReceived: 0, hpBefore: 65, hpAfter: 65 },
  outcome: "STALEMATE",
};

export const FIXTURE_KO: CombatResult = {
  roundNumber: 6,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "WIZARD", move: "SPECIAL", power: 97,
             damageReceived: 0, hpBefore: 51, hpAfter: 51 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "BOXER", move: "DODGE", power: 30,
             damageReceived: 34, hpBefore: 20, hpAfter: 0 },
  outcome: "KO",
  winnerPlayerId: "p1",
};

// Extra coverage: the two outcomes the canonical set doesn't exercise.
export const FIXTURE_P1_HIT: CombatResult = {
  roundNumber: 7,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "BOXER", move: "DODGE", power: 20,
             damageReceived: 24, hpBefore: 60, hpAfter: 36 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "SAMURAI", move: "HEAVY_ATTACK", power: 85,
             damageReceived: 0, hpBefore: 40, hpAfter: 40 },
  outcome: "P1_HIT",
};

export const FIXTURE_P2_HIT_PLAIN: CombatResult = {
  roundNumber: 8,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "SAMURAI", move: "PUNCH", power: 77,
             damageReceived: 0, hpBefore: 36, hpAfter: 36 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "WIZARD", move: "BLOCK", power: 10,
             damageReceived: 12, hpBefore: 40, hpAfter: 28 },
  outcome: "P2_HIT",
};

export interface Fixture {
  label: string;
  result: CombatResult;
}

export const FIXTURES: Fixture[] = [
  { label: "BLOCKED", result: FIXTURE_BLOCKED },
  { label: "DODGED", result: FIXTURE_P2_HIT },
  { label: "DOUBLE HIT", result: FIXTURE_DOUBLE_HIT },
  { label: "CLASH", result: FIXTURE_CLASH },
  { label: "STALEMATE", result: FIXTURE_STALEMATE },
  { label: "KO", result: FIXTURE_KO },
  { label: "P1 HIT", result: FIXTURE_P1_HIT },
  { label: "P2 HIT", result: FIXTURE_P2_HIT_PLAIN },
];
