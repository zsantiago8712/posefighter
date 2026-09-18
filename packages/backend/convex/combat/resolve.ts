import type { CombatOutcome, CombatPlayerResult, CombatResult, Fighter, Move } from "../shared/contracts";
import { BASE_DAMAGE, CLASH_FRACTION, DEFENSE_TABLE, computeDamage, isAttack } from "./rules";

export interface ResolveInputPlayer {
  playerId: string;
  nickname: string;
  fighter: Fighter;
  move: Move;
  power: number;
  hp: number;
  posePhotoUrl?: string;
}

export interface ResolveInput {
  roundNumber: number;
  p1: ResolveInputPlayer;
  p2: ResolveInputPlayer;
}

type Attack = "PUNCH" | "HEAVY_ATTACK" | "SPECIAL";
type Defense = "BLOCK" | "DODGE";

/** Damage dealt by `attacker` to `defender`, and the fraction of base that landed. */
function attackInto(attacker: ResolveInputPlayer, defender: ResolveInputPlayer): { damage: number; fraction: number } {
  if (!isAttack(attacker.move)) return { damage: 0, fraction: 0 };
  const base = BASE_DAMAGE[attacker.move];
  let fraction: number;
  if (isAttack(defender.move)) {
    fraction = attacker.move === defender.move ? CLASH_FRACTION : 1;
  } else {
    fraction = DEFENSE_TABLE[defender.move as Defense][attacker.move as Attack];
  }
  return { damage: computeDamage(base, fraction, attacker.power), fraction };
}

/**
 * Pure, deterministic round resolution. See docs/GAME_DESIGN.md.
 * Never throws for valid moves; never uses randomness.
 */
export function resolveRound(input: ResolveInput): CombatResult {
  const { p1, p2, roundNumber } = input;

  const p1Attack = attackInto(p1, p2); // damage to p2
  const p2Attack = attackInto(p2, p1); // damage to p1

  const rawHp1 = p1.hp - p2Attack.damage;
  const rawHp2 = p2.hp - p1Attack.damage;
  const hp1 = Math.max(0, rawHp1);
  const hp2 = Math.max(0, rawHp2);

  let outcome: CombatOutcome;
  let winnerPlayerId: string | undefined;

  const bothAttack = isAttack(p1.move) && isAttack(p2.move);
  const bothDefend = !isAttack(p1.move) && !isAttack(p2.move);

  if (hp1 === 0 || hp2 === 0) {
    outcome = "KO";
    if (hp1 === 0 && hp2 === 0) {
      // Deterministic tiebreak: higher raw hp, then higher power, then host.
      if (rawHp1 !== rawHp2) winnerPlayerId = rawHp1 > rawHp2 ? p1.playerId : p2.playerId;
      else if (p1.power !== p2.power) winnerPlayerId = p1.power > p2.power ? p1.playerId : p2.playerId;
      else winnerPlayerId = p1.playerId;
    } else {
      winnerPlayerId = hp1 === 0 ? p2.playerId : p1.playerId;
    }
  } else if (bothDefend) {
    outcome = "STALEMATE";
  } else if (bothAttack) {
    outcome = p1.move === p2.move ? "CLASH" : "DOUBLE_HIT";
  } else {
    // exactly one attacker
    const attackerIsP1 = isAttack(p1.move);
    const defender = attackerIsP1 ? p2 : p1;
    const landed = attackerIsP1 ? p1Attack : p2Attack;
    if (landed.fraction >= 1) {
      outcome = attackerIsP1 ? "P2_HIT" : "P1_HIT";
    } else {
      outcome = defender.move === "BLOCK" ? "BLOCKED" : "DODGED";
    }
  }

  const player1: CombatPlayerResult = {
    playerId: p1.playerId,
    nickname: p1.nickname,
    fighter: p1.fighter,
    move: p1.move,
    power: p1.power,
    damageReceived: p1.hp - hp1,
    hpBefore: p1.hp,
    hpAfter: hp1,
    ...(p1.posePhotoUrl ? { posePhotoUrl: p1.posePhotoUrl } : {}),
  };
  const player2: CombatPlayerResult = {
    playerId: p2.playerId,
    nickname: p2.nickname,
    fighter: p2.fighter,
    move: p2.move,
    power: p2.power,
    damageReceived: p2.hp - hp2,
    hpBefore: p2.hp,
    hpAfter: hp2,
    ...(p2.posePhotoUrl ? { posePhotoUrl: p2.posePhotoUrl } : {}),
  };

  return {
    roundNumber,
    player1,
    player2,
    outcome,
    ...(winnerPlayerId ? { winnerPlayerId } : {}),
  };
}
