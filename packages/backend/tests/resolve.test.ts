import { describe, expect, test } from "bun:test";

import { resolveRound, type ResolveInputPlayer } from "../convex/combat/resolve";
import type { Move } from "../convex/shared/contracts";

function p(id: "p1" | "p2", move: Move, power = 50, hp = 100): ResolveInputPlayer {
  return { playerId: id, nickname: id.toUpperCase(), fighter: "BOXER", move, power, hp };
}

function run(m1: Move, m2: Move, opts: { power1?: number; power2?: number; hp1?: number; hp2?: number } = {}) {
  return resolveRound({
    roundNumber: 1,
    p1: p("p1", m1, opts.power1 ?? 50, opts.hp1 ?? 100),
    p2: p("p2", m2, opts.power2 ?? 50, opts.hp2 ?? 100),
  });
}

describe("resolveRound", () => {
  test("PUNCH vs BLOCK → BLOCKED with chip damage", () => {
    const r = run("PUNCH", "BLOCK");
    expect(r.outcome).toBe("BLOCKED");
    expect(r.player2.damageReceived).toBe(3);
    expect(r.player1.damageReceived).toBe(0);
  });

  test("HEAVY vs BLOCK → block broken, full damage → P2_HIT", () => {
    const r = run("HEAVY_ATTACK", "BLOCK");
    expect(r.outcome).toBe("P2_HIT");
    expect(r.player2.damageReceived).toBe(25);
  });

  test("SPECIAL vs DODGE → full damage → P2_HIT", () => {
    const r = run("SPECIAL", "DODGE");
    expect(r.outcome).toBe("P2_HIT");
    expect(r.player2.damageReceived).toBe(30);
  });

  test("HEAVY vs DODGE → DODGED, zero damage", () => {
    const r = run("HEAVY_ATTACK", "DODGE");
    expect(r.outcome).toBe("DODGED");
    expect(r.player2.damageReceived).toBe(0);
  });

  test("defender attacking as P2 → P1_HIT", () => {
    const r = run("BLOCK", "HEAVY_ATTACK");
    expect(r.outcome).toBe("P1_HIT");
    expect(r.player1.damageReceived).toBe(25);
  });

  test("same attack → CLASH, both half damage", () => {
    const r = run("PUNCH", "PUNCH");
    expect(r.outcome).toBe("CLASH");
    expect(r.player1.damageReceived).toBe(8);
    expect(r.player2.damageReceived).toBe(8);
  });

  test("different attacks → DOUBLE_HIT, both full damage", () => {
    const r = run("HEAVY_ATTACK", "SPECIAL");
    expect(r.outcome).toBe("DOUBLE_HIT");
    expect(r.player1.damageReceived).toBe(30);
    expect(r.player2.damageReceived).toBe(25);
  });

  test("BLOCK vs DODGE → STALEMATE", () => {
    const r = run("BLOCK", "DODGE");
    expect(r.outcome).toBe("STALEMATE");
    expect(r.player1.hpAfter).toBe(100);
    expect(r.player2.hpAfter).toBe(100);
  });

  test("power modifies damage between 0.85x and 1.15x", () => {
    expect(run("SPECIAL", "DODGE", { power1: 100 }).player2.damageReceived).toBe(35);
    expect(run("SPECIAL", "DODGE", { power1: 0 }).player2.damageReceived).toBe(26);
  });

  test("hp reaches 0 → KO with winner, hp clamped", () => {
    const r = run("SPECIAL", "DODGE", { hp2: 20 });
    expect(r.outcome).toBe("KO");
    expect(r.player2.hpAfter).toBe(0);
    expect(r.player2.damageReceived).toBe(20);
    expect(r.winnerPlayerId).toBe("p1");
  });

  test("double KO → deterministic tiebreak by raw hp then power then host", () => {
    const r = run("HEAVY_ATTACK", "SPECIAL", { hp1: 10, hp2: 10 });
    // p1 takes 30 (raw -20), p2 takes 25 (raw -15) → p2 has higher raw hp → p2 wins
    expect(r.outcome).toBe("KO");
    expect(r.winnerPlayerId).toBe("p2");

    const tie = run("PUNCH", "PUNCH", { hp1: 5, hp2: 5, power1: 50, power2: 50 });
    expect(tie.winnerPlayerId).toBe("p1");
  });
});
