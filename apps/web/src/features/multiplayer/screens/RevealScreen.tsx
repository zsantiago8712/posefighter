import type { CombatPlayerResult, CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { useEffect, useState } from "react";

import { FIGHTER_META, MOVE_META, MOVE_NAMES, Screen, Sub, Title } from "../ui";
import { isAttackMove } from "./FightScreen";

const HOLD_MS = 2600;

/**
 * Both real photos side by side, then 3·2·1 FIGHT!
 * The final "FIGHT!" tap/auto-advance is also the user gesture that unlocks audio for Phaser.
 */
export function RevealScreen({ result, onDone }: { result: CombatResult; onDone: () => void }) {
  const [count, setCount] = useState<number | null>(null); // null = holding photos, 3..1, 0 = FIGHT!

  useEffect(() => {
    const t0 = setTimeout(() => setCount(3), HOLD_MS);
    return () => clearTimeout(t0);
  }, []);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount(count - 1), 800);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <Screen className="justify-between gap-4" >
      <div className="flex flex-col items-center gap-1 pt-2">
        <Sub>round {result.roundNumber}</Sub>
        <Title size="lg">
          <span className="text-yellow-300">Reveal</span>
        </Title>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <PoseCard p={result.player1} />
        <PoseCard p={result.player2} />
      </div>

      <div className="flex h-32 items-center justify-center" onClick={() => count !== null && count > 0 && setCount(0)}>
        {count === null ? (
          <p className="arcade animate-pulse text-2xl text-white/60 italic">get ready…</p>
        ) : count > 0 ? (
          <span key={count} className="arcade animate-[ping_0.8s_ease-out] text-[8rem] leading-none text-white italic">
            {count}
          </span>
        ) : (
          <span className="arcade text-7xl leading-none text-rose-500 italic drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]">FIGHT!</span>
        )}
      </div>
    </Screen>
  );
}

function PoseCard({ p }: { p: CombatPlayerResult }) {
  const fm = FIGHTER_META[p.fighter];
  const mm = MOVE_META[p.move];
  const attack = isAttackMove(p.move);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="arcade w-full truncate text-center text-2xl uppercase italic">{p.nickname}</div>
      <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-4 border-white/80 bg-gradient-to-br ${fm.color} shadow-2xl ${fm.glow}`}>
        {p.posePhotoUrl ? (
          <img src={p.posePhotoUrl} alt={`${p.nickname} pose`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl">{fm.emoji}</div>
        )}
        <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-widest">{fm.label}</span>
      </div>
      <div className={`arcade w-full rounded-xl ${mm.color} px-2 py-1 text-center text-black`}>
        <div className="text-xl leading-tight uppercase italic">{MOVE_NAMES[p.fighter][p.move]}</div>
        <div className="text-[10px] font-bold tracking-widest opacity-80">
          {mm.emoji} {mm.label}
        </div>
      </div>
      <div className="text-center leading-none">
        <div className="text-[10px] font-bold tracking-[0.3em] text-white/50">{attack ? "POWER" : "DEFENSE"}</div>
        <div className="arcade text-4xl text-yellow-300 italic">{p.power}</div>
      </div>
    </div>
  );
}
