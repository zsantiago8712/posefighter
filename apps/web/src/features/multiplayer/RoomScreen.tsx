import { api } from "@posefighter/backend/convex/_generated/api";
import { MAX_HP, type CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BattleScreen, type BattlePanel } from "./screens/BattleScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { getSavedNickname, usePlayerToken } from "./usePlayerToken";
import { ArcadeButton, Screen, Sub, Title } from "./ui";
import type { RoomView } from "./types";

/**
 * Derives the screen from Convex room state + a little local presentation state.
 *
 *   LOBBY                      → LobbyScreen
 *   IN_ROUND / REVEAL          → BattleScreen (arena always mounted; side panel = camera | fight | waiting)
 *   FINISHED (after cinematic) → ResultScreen
 */
export function RoomScreen({ code, fake, fresh = false }: { code: string; fake: boolean; fresh?: boolean }) {
  const token = usePlayerToken(fresh);
  const navigate = useNavigate();

  // Once the fresh token exists, drop `?fresh` from the URL so a reload keeps this seat.
  useEffect(() => {
    if (fresh && token) void navigate({ to: "/room/$code", params: { code }, search: { fake }, replace: true });
  }, [fresh, token, code, fake, navigate]);

  const room = useQuery(api.rooms.getRoomView, token ? { code, token } : "skip");
  const rounds = useQuery(api.rounds.listRounds, room ? { code } : "skip");
  const joinRoom = useMutation(api.rooms.joinRoom);
  const readyForNextRound = useMutation(api.rounds.readyForNextRound);
  const forceNextRound = useMutation(api.rounds.forceNextRound);

  // Auto-join via deep link when this token has no seat yet.
  const joinAttempted = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  useEffect(() => {
    if (!token || room === undefined || room === null || room.me || joinAttempted.current) return;
    joinAttempted.current = true;
    joinRoom({ code, token, nickname: getSavedNickname() || undefined }).catch((e) => setJoinError(String(e?.message ?? e)));
  }, [token, room, code, joinRoom]);

  // Latest resolved round (stable identity per roundNumber so the arena doesn't replay on unrelated updates).
  const latest = rounds && rounds.length > 0 ? rounds[rounds.length - 1] : undefined;
  const latestRound = latest?.roundNumber ?? 0;
  const latestResult = useMemo(() => latest, [latestRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // Which round's cinematic have we already handled? (reset on rematch when rounds disappear)
  const [watched, setWatched] = useState<{ round: number; phase: "fight" | "waiting" | "done" } | null>(null);
  useEffect(() => {
    if (!room) return;
    const resolvedNow = (room.status === "REVEAL" || room.status === "FINISHED") && latestResult?.roundNumber === room.roundNumber;
    if (resolvedNow && (!watched || watched.round !== room.roundNumber)) setWatched({ round: room.roundNumber, phase: "fight" });
    if (rounds && rounds.length === 0 && watched) setWatched(null); // rematch
  }, [room, latestResult, rounds, watched]);

  const onFightComplete = useCallback(async () => {
    if (!token || !room || !watched || watched.phase !== "fight") return;
    if (room.status === "FINISHED") {
      setWatched((w) => (w ? { ...w, phase: "done" } : w));
      return;
    }
    setWatched((w) => (w ? { ...w, phase: "waiting" } : w));
    await readyForNextRound({ code, token, roundNumber: watched.round });
  }, [token, room, watched, code, readyForNextRound]);

  // ---- render -------------------------------------------------------------

  if (joinError) {
    return (
      <Centered>
        <Title size="md">Can't join</Title>
        <Sub>{friendly(joinError)}</Sub>
        <ArcadeButton tone="ghost" onClick={() => void navigate({ to: "/" })}>
          Back home
        </ArcadeButton>
      </Centered>
    );
  }

  if (!token || room === undefined) return <Centered><Sub>connecting…</Sub></Centered>;

  if (room === null) {
    return (
      <Centered>
        <Title size="md">Room {code} not found</Title>
        <ArcadeButton tone="ghost" onClick={() => void navigate({ to: "/" })}>
          Back home
        </ArcadeButton>
      </Centered>
    );
  }

  if (!room.me) return <Centered><Sub>joining {code}…</Sub></Centered>;

  const session = { code, token, room };

  if (room.status === "LOBBY") return <LobbyScreen {...session} />;

  if (room.status === "FINISHED" && (!latestResult || watched?.phase === "done" || watched?.round !== room.roundNumber)) {
    return <ResultScreen {...session} lastResult={latestResult ?? null} />;
  }

  const arenaResult: CombatResult = latestResult ?? introResult(room);

  let panel: BattlePanel;
  if (room.status === "IN_ROUND") {
    panel = { kind: "capture" };
  } else if (watched?.phase === "fight" && latestResult) {
    panel = { kind: "fight", result: latestResult };
  } else {
    panel = { kind: "waiting", onForce: () => void forceNextRound({ code, token, roundNumber: room.roundNumber }) };
  }

  return <BattleScreen session={session} fake={fake} arenaResult={arenaResult} panel={panel} onFightComplete={() => void onFightComplete()} />;
}

/**
 * Before round 1 there is no CombatResult yet. The arena still needs both fighters on stage, so we feed it a
 * zero-damage STALEMATE with roundNumber 0. GAME may special-case roundNumber 0 as an "intro" (no moves).
 */
function introResult(room: RoomView): CombatResult {
  const p1 = room.players.find((p) => p.seat === 1) ?? room.players[0]!;
  const p2 = room.players.find((p) => p.seat === 2) ?? room.players[1] ?? p1;
  const mk = (p: typeof p1) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    fighter: p.fighter,
    move: "BLOCK" as const,
    power: 0,
    damageReceived: 0,
    hpBefore: MAX_HP,
    hpAfter: MAX_HP,
  });
  return { roundNumber: 0, player1: mk(p1), player2: { ...mk(p2), move: "DODGE" }, outcome: "STALEMATE" };
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Screen className="justify-center gap-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4">{children}</div>
    </Screen>
  );
}

function friendly(msg: string): string {
  if (msg.includes("ROOM_FULL")) return "This room already has two fighters.";
  if (msg.includes("BATTLE_ALREADY_STARTED")) return "This battle already started.";
  if (msg.includes("ROOM_NOT_FOUND")) return "Room not found.";
  return "Something went wrong.";
}
