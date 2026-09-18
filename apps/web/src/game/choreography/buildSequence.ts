import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { type FightStep, type Reaction, type Side, isAttack, otherSide } from "./steps";

const OUTCOME_BANNER: Partial<Record<CombatResult["outcome"], { text: string; color: string }>> = {
  BLOCKED: { text: "BLOCKED!", color: "#4da3ff" },
  DODGED: { text: "DODGED!", color: "#c8c8c8" },
  CLASH: { text: "CLASH!", color: "#ffd93b" },
  DOUBLE_HIT: { text: "DOUBLE HIT!", color: "#ff7a3b" },
  STALEMATE: { text: "…", color: "#9a9a9a" },
};

function reactionFor(result: CombatResult, defender: Side): Reaction {
  const move = result[defender === "p1" ? "player1" : "player2"].move;
  if (move === "BLOCK") return "block";
  if (move === "DODGE") return "dodge";
  return "hit";
}

/** Who is swinging this round? Prefers the side whose opponent took damage; falls back to whoever attacked. */
function pickAttacker(result: CombatResult): Side {
  const p1Attacks = isAttack(result.player1.move);
  const p2Attacks = isAttack(result.player2.move);
  if (p1Attacks && !p2Attacks) return "p1";
  if (p2Attacks && !p1Attacks) return "p2";
  if (result.player2.damageReceived > 0 && result.player1.damageReceived === 0) return "p1";
  if (result.player1.damageReceived > 0 && result.player2.damageReceived === 0) return "p2";
  return "p1";
}

/** Pure: CombatResult → ordered presentation steps. No Phaser types. */
export function buildSequence(result: CombatResult): FightStep[] {
  const steps: FightStep[] = [
    { kind: "banner", text: `ROUND ${result.roundNumber}`, color: "#ffffff" },
    { kind: "banner", text: "FIGHT!", color: "#ffd93b" },
  ];
  const { player1, player2, outcome } = result;

  const attackFrom = (attacker: Side, lethal = false): FightStep => {
    const defender = otherSide(attacker);
    const a = attacker === "p1" ? player1 : player2;
    const d = defender === "p1" ? player1 : player2;
    return { kind: "attack", attacker, move: a.move, reaction: reactionFor(result, defender), damage: d.damageReceived, lethal };
  };

  switch (outcome) {
    case "P1_HIT":
      steps.push(attackFrom("p2"));
      break;
    case "P2_HIT":
      steps.push(attackFrom("p1"));
      break;
    case "BLOCKED":
    case "DODGED": {
      steps.push(attackFrom(pickAttacker(result)));
      break;
    }
    case "CLASH":
      steps.push({ kind: "clash", move: player1.move, damageP1: player1.damageReceived, damageP2: player2.damageReceived });
      break;
    case "DOUBLE_HIT":
      steps.push(attackFrom("p1"), attackFrom("p2"));
      break;
    case "STALEMATE":
      steps.push({ kind: "defend", side: "p1", move: player1.move }, { kind: "defend", side: "p2", move: player2.move });
      break;
    case "KO": {
      const loser: Side =
        result.winnerPlayerId === player1.playerId ? "p2"
        : result.winnerPlayerId === player2.playerId ? "p1"
        : player1.hpAfter <= 0 ? "p1" : "p2";
      const winner = otherSide(loser);
      // If both traded blows, show the winner's hit last so the KO lands on the final impact.
      if (isAttack(result[loser === "p1" ? "player1" : "player2"].move) && result[winner === "p1" ? "player1" : "player2"].damageReceived > 0) {
        steps.push(attackFrom(loser));
      }
      steps.push(attackFrom(winner, true), { kind: "ko", loser }, { kind: "victory", winner });
      break;
    }
  }

  const banner = OUTCOME_BANNER[outcome];
  if (banner) steps.push({ kind: "banner", text: banner.text, color: banner.color });
  return steps;
}
