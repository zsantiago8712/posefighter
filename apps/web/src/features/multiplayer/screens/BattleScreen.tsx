import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { Component, type ReactNode, useEffect, useState } from "react";

import { FightPlayer, unlockAudio } from "@/game";

import type { RoomSession } from "../types";
import { ArcadeButton, FIGHTER_META, MOVE_META, MOVE_NAMES, Sub } from "../ui";
import { PoseLegend } from "../PoseGuide";
import { CapturePanel } from "./CapturePanel";
import { FightSummaryFallback } from "./FightSummaryFallback";

export type BattlePanel =
  | { kind: "capture" }
  | { kind: "fight"; result: CombatResult }
  | { kind: "waiting"; onForce?: () => void };

/**
 * THE battle screen. One layout for the whole match, nothing ever navigates away:
 *
 *   desktop  [ ARENA (Phaser, always mounted) ][ CAMERA / status panel ]
 *   phone    [ ARENA full screen ] + camera as a floating picture-in-picture card on the right
 *
 * The arena shows the last resolved round (fighters end in idle) or an intro when the match starts;
 * when a new CombatResult arrives it plays the cinematic in place.
 */
export function BattleScreen({
  session,
  fake,
  arenaResult,
  panel,
  onFightComplete,
}: {
  session: RoomSession;
  fake: boolean;
  /** What the arena is showing: latest resolved round, or an intro result before round 1. */
  arenaResult: CombatResult;
  panel: BattlePanel;
  onFightComplete: () => void;
}) {
  const { room } = session;
  const me = room.me!;
  const desktop = useIsDesktop();

  return (
    <main
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#0a0614] text-white lg:grid lg:grid-cols-[minmax(0,1fr)_400px]"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
      onPointerDown={unlockAudio}
    >
      {/* ARENA — on phones it takes the top band; FightPlayer's own min-height:100dvh is overridden so it fits. */}
      <section className="relative min-h-0 flex-1 overflow-hidden [&>div]:h-full! [&>div]:min-h-0!">
        <ArenaErrorBoundary fallback={<FightSummaryFallback result={arenaResult} onComplete={onFightComplete} />}>
          <FightPlayer result={arenaResult} onComplete={onFightComplete} />
        </ArenaErrorBoundary>
      </section>

      {/* Exactly ONE side panel is mounted (the camera must not be opened twice). */}
      {desktop ? (
        <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[#09090b]">
          <div className="min-h-0 flex-1">
            <SidePanel session={session} fake={fake} panel={panel} />
          </div>
          {panel.kind === "capture" && (
            <div className="border-t border-white/10 p-3">
              <PoseLegend fighter={me.fighter} />
            </div>
          )}
        </aside>
      ) : (
        <div className="h-[34dvh] shrink-0 border-t border-white/15 bg-[#09090b] pb-[env(safe-area-inset-bottom)]">
          <PhoneDock session={session} fake={fake} panel={panel} />
        </div>
      )}
    </main>
  );
}

/** Phone bottom dock: [camera 3:4 | pose legend] while posing, two photos side by side during the fight. */
function PhoneDock({ session, fake, panel }: { session: RoomSession; fake: boolean; panel: BattlePanel }) {
  const { room } = session;
  const me = room.me!;
  if (panel.kind === "capture" && !fake) {
    return (
      <div className="flex h-full w-full gap-2 p-2">
        <div className="h-full shrink-0 overflow-hidden rounded-xl border border-white/30" style={{ aspectRatio: "3 / 4" }}>
          <CapturePanel {...session} fake={false} compact />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="arcade mb-1 text-center text-xs tracking-widest text-yellow-300 uppercase">Round {room.roundNumber}</div>
          <PoseLegend fighter={me.fighter} />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full w-full">
      <SidePanel session={session} fake={fake} panel={panel} compact horizontal />
    </div>
  );
}

/** Tailwind `lg` breakpoint, mirrored in JS so we can mount a single panel. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true));
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

function SidePanel({
  session,
  fake,
  panel,
  compact = false,
  horizontal = false,
}: {
  session: RoomSession;
  fake: boolean;
  panel: BattlePanel;
  compact?: boolean;
  horizontal?: boolean;
}) {
  const { room } = session;
  if (panel.kind === "capture") return <CapturePanel {...session} fake={fake} compact={compact} />;
  if (panel.kind === "fight") return <FightPanel result={panel.result} compact={compact} horizontal={horizontal} />;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] p-4 text-center">
      <h2 className={`arcade ${compact ? "text-xl" : "text-3xl"} uppercase italic`}>Round {room.roundNumber} done</h2>
      <Sub>waiting for {room.opponent?.nickname ?? "opponent"}…</Sub>
      {room.isHost && panel.onForce && !compact && (
        <ArcadeButton tone="ghost" onClick={panel.onForce}>
          Force next round
        </ArcadeButton>
      )}
    </div>
  );
}

/** While the cinematic plays: both REAL pose photos + moves. The "ridiculous photo vs epic fight" moment. */
function FightPanel({ result, compact, horizontal = false }: { result: CombatResult; compact: boolean; horizontal?: boolean }) {
  const players = [result.player1, result.player2];
  if (horizontal) {
    return (
      <div className="flex h-full w-full items-stretch gap-2 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] p-2">
        {players.map((p, i) => {
          const fm = FIGHTER_META[p.fighter];
          const mm = MOVE_META[p.move];
          return (
            <div key={p.playerId} className={`relative min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-white/70 bg-gradient-to-br ${fm.color}`}>
              {p.posePhotoUrl ? (
                <img src={p.posePhotoUrl} alt={`${p.nickname} pose`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">{fm.emoji}</div>
              )}
              <div className={`absolute top-1 ${i === 0 ? "left-1" : "right-1"} rounded-md bg-black/60 px-2 py-0.5`}>
                <span className="arcade text-sm uppercase italic">{p.nickname}</span>
              </div>
              <div className={`absolute inset-x-0 bottom-0 ${mm.color} px-1 py-1 text-center text-black`}>
                <div className="arcade text-base leading-none uppercase italic">
                  {mm.emoji} {MOVE_NAMES[p.fighter][p.move]}
                </div>
                <div className="text-[9px] font-bold tracking-widest opacity-75">POWER {p.power}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className={`flex h-full flex-col justify-center gap-3 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] ${compact ? "p-2" : "p-4"}`}>
      {!compact && (
        <h2 className="arcade text-center text-4xl text-rose-500 uppercase italic drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]">Fight!</h2>
      )}
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        {players.map((p) => {
          const fm = FIGHTER_META[p.fighter];
          const mm = MOVE_META[p.move];
          return (
            <div key={p.playerId} className="flex flex-col items-center gap-1">
              {!compact && <div className="arcade w-full truncate text-center text-xl uppercase italic">{p.nickname}</div>}
              <div className={`relative w-full overflow-hidden rounded-xl border-2 border-white/70 bg-gradient-to-br ${fm.color}`} style={{ aspectRatio: compact ? "4 / 3" : "3 / 4" }}>
                {p.posePhotoUrl ? (
                  <img src={p.posePhotoUrl} alt={`${p.nickname} pose`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl">{fm.emoji}</div>
                )}
                <div className={`absolute inset-x-0 bottom-0 ${mm.color} px-1 py-0.5 text-center text-black`}>
                  <span className={`arcade ${compact ? "text-xs" : "text-lg"} uppercase italic`}>
                    {mm.emoji} {MOVE_NAMES[p.fighter][p.move]}
                  </span>
                </div>
              </div>
              {!compact && (
                <div className="arcade text-2xl text-yellow-300 italic">
                  {p.power} <span className="text-[10px] tracking-widest text-white/50">POWER</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

class ArenaErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[BattleScreen] Phaser arena failed, using text fallback", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
