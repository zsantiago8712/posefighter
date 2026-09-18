import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { FightPlayer } from "@/game";
import { FIXTURES } from "@/game/fixtures";

export const Route = createFileRoute("/debug/fight")({
  ssr: false,
  component: DebugFightPage,
});

interface Run {
  index: number;
  id: number;
  startedAt: number;
}

function DebugFightPage() {
  const [run, setRun] = useState<Run>({ index: 0, id: 0, startedAt: Date.now() });
  const [playAll, setPlayAll] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  // Mirrors the real flow: a tap ("TAP TO FIGHT") unlocks audio before the first Phaser mount.
  const [started, setStarted] = useState(false);
  const playAllRef = useRef(playAll);
  playAllRef.current = playAll;

  const start = useCallback((index: number) => {
    setRun((r) => ({ index, id: r.id + 1, startedAt: Date.now() }));
  }, []);

  const onComplete = useCallback(() => {
    setCompleted((c) => c + 1);
    setLastDuration((Date.now() - run.startedAt) / 1000);
    if (playAllRef.current) {
      window.setTimeout(() => start((run.index + 1) % FIXTURES.length), 800);
    }
  }, [run, start]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const fixture = FIXTURES[run.index] ?? FIXTURES[0];
  if (!fixture) return null;
  const result: CombatResult = fixture.result;

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white md:flex-row" style={{ touchAction: "none" }}>
      {/* On desktop the player takes the remaining width and the panel becomes a right-hand column */}
      <div className="relative min-h-0 min-w-0 flex-1">
        {started ? (
          <FightPlayer key={run.id} result={result} onComplete={onComplete} />
        ) : (
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              start(run.index);
            }}
            className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0a0614]"
            style={{ minHeight: "100dvh" }}
          >
            <span className="text-6xl font-black uppercase italic tracking-tight text-yellow-400 drop-shadow-[0_6px_0_#000]">TAP TO FIGHT</span>
            <span className="text-sm uppercase tracking-widest text-white/60">unlocks audio · {fixture.label}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowControls((s) => !s)}
        className="absolute right-2 top-2 z-20 rounded-md bg-black/60 px-3 py-2 text-xs font-bold uppercase tracking-wide md:hidden"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        {showControls ? "HIDE" : "DEBUG"}
      </button>

      {showControls && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-black/70 p-3 backdrop-blur md:static md:w-80 md:shrink-0 md:gap-3 md:border-l md:border-white/10 md:bg-neutral-950 md:p-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <h1 className="hidden text-lg font-black uppercase tracking-wider text-yellow-400 md:block">POSE FIGHT · /debug/fight</h1>
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-white/70 md:flex-col md:items-start">
            <span>
              #{run.id} · {fixture.label} · {result.player1.fighter} {result.player1.move} vs {result.player2.fighter} {result.player2.move}
            </span>
            <span>
              done ×{completed}
              {lastDuration !== null ? ` · ${lastDuration.toFixed(1)}s` : ""}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            {FIXTURES.map((f, i) => (
              <button
                key={f.label}
                type="button"
                onClick={() => start(i)}
                className={`shrink-0 rounded-md px-4 text-sm font-bold uppercase md:w-[calc(50%-4px)] ${i === run.index ? "bg-yellow-400 text-black" : "bg-white/15"}`}
                style={{ minHeight: 56 }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => start(run.index)} className="rounded-md bg-white/15 font-bold uppercase" style={{ minHeight: 56 }}>
              Replay
            </button>
            <button
              type="button"
              onClick={() => start(Math.floor(Math.random() * FIXTURES.length))}
              className="rounded-md bg-white/15 font-bold uppercase"
              style={{ minHeight: 56 }}
            >
              Random
            </button>
            <button
              type="button"
              onClick={() => setPlayAll((p) => !p)}
              className={`rounded-md font-bold uppercase ${playAll ? "bg-pink-500" : "bg-white/15"}`}
              style={{ minHeight: 56 }}
            >
              {playAll ? "Stop loop" : "Play all"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
