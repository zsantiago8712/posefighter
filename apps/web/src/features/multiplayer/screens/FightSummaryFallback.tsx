import type { CombatResult, Move } from "@posefighter/backend/convex/shared/contracts";
import { useEffect, useState } from "react";

import { ArcadeButton, FighterBadge, MOVE_META, MOVE_NAMES, Screen, Sub, Title } from "../ui";

export function isAttackMove(m: Move): boolean {
  return m === "PUNCH" || m === "HEAVY_ATTACK" || m === "SPECIAL";
}

const OUTCOME_LABEL: Record<CombatResult["outcome"], string> = {
  P1_HIT: "HIT!",
  P2_HIT: "HIT!",
  BLOCKED: "BLOCKED!",
  DODGED: "DODGED!",
  CLASH: "CLASH!",
  DOUBLE_HIT: "DOUBLE HIT!",
  STALEMATE: "…",
  KO: "K.O.!",
};

/**
 * Text/CSS fallback shown only if the Phaser cinematic (FightPlayer) throws.
 *
 * INTEGRATION POINT (GAME): replace the body with
 *   <FightPlayer result={result} onComplete={onComplete} />
 * imported from "@/game". Keep this fallback behind a flag for demo insurance.
 */
export function FightSummaryFallback({ result, onComplete }: { result: CombatResult; onComplete: () => void }) {
  const { player1: p1, player2: p2 } = result;
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0 intro, 1 impact, 2 done

  useEffect(() => {
    const a = setTimeout(() => setPhase(1), 900);
    const b = setTimeout(() => setPhase(2), 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const hp1 = phase >= 1 ? p1.hpAfter : p1.hpBefore;
  const hp2 = phase >= 1 ? p2.hpAfter : p2.hpBefore;

  return (
    <Screen className={`justify-between transition-colors ${phase === 1 ? "bg-white/10" : ""}`}>
      <header className="flex w-full max-w-md items-start gap-3">
        <FighterBadge fighter={p1.fighter} nickname={p1.nickname} hp={hp1} side="left" />
        <div className="arcade pt-1 text-center text-sm leading-none text-white/50">
          ROUND
          <br />
          <span className="text-3xl text-yellow-300">{result.roundNumber}</span>
        </div>
        <FighterBadge fighter={p2.fighter} nickname={p2.nickname} hp={hp2} side="right" />
      </header>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
          <MoveTag p={p1} side="left" flash={phase === 1 && p1.damageReceived > 0} />
          <span className="arcade text-3xl text-rose-500 italic">VS</span>
          <MoveTag p={p2} side="right" flash={phase === 1 && p2.damageReceived > 0} />
        </div>

        <div className="flex h-28 items-center justify-center">
          {phase >= 1 && (
            <Title size="xl">
              <span className={result.outcome === "KO" ? "text-rose-500" : "text-yellow-300"}>{OUTCOME_LABEL[result.outcome]}</span>
            </Title>
          )}
        </div>

        {phase >= 1 && (
          <div className="grid w-full grid-cols-2 gap-3 text-center">
            <Damage n={p1.damageReceived} />
            <Damage n={p2.damageReceived} />
          </div>
        )}
      </div>

      <div className="w-full max-w-md">
        {phase === 2 ? (
          <ArcadeButton big onClick={onComplete}>
            {result.outcome === "KO" ? "See results" : "Next round"}
          </ArcadeButton>
        ) : (
          <Sub>cinematic placeholder · phaser coming</Sub>
        )}
      </div>
    </Screen>
  );
}

function MoveTag({ p, side, flash }: { p: CombatResult["player1"]; side: "left" | "right"; flash: boolean }) {
  const mm = MOVE_META[p.move];
  return (
    <div className={`flex flex-col ${side === "right" ? "items-end text-right" : "items-start"} transition-transform ${flash ? "translate-x-0 scale-95 text-rose-400" : ""}`}>
      <span className="text-4xl">{mm.emoji}</span>
      <span className="arcade text-xl leading-none uppercase italic">{MOVE_NAMES[p.fighter][p.move]}</span>
      <span className="text-[10px] font-bold tracking-widest text-white/50">
        {mm.label} · {p.power}
      </span>
    </div>
  );
}

function Damage({ n }: { n: number }) {
  return (
    <div className={`arcade text-5xl italic ${n > 0 ? "text-rose-500" : "text-white/30"}`}>{n > 0 ? `-${n}` : "0"}</div>
  );
}
