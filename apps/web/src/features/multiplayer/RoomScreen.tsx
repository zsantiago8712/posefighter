import { api } from "@posefighter/backend/convex/_generated/api";
import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChooseMoveScreen } from "./screens/ChooseMoveScreen";
import { FightScreen } from "./screens/FightScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { getSavedNickname, usePlayerToken } from "./usePlayerToken";
import { ArcadeButton, Screen, Sub, Title } from "./ui";

/**
 * Derives the current screen from Convex room state + a little local presentation state.
 *
 * Convex truth:  LOBBY | IN_ROUND | REVEAL | FINISHED  (+ my submission flag)
 * Local state:   which round I have already watched (reveal + fight), so the same round
 *                doesn't replay, and FINISHED still shows the final round once.
 */
export function RoomScreen({ code, fake, fresh = false }: { code: string; fake: boolean; fresh?: boolean }) {
  const token = usePlayerToken(fresh);
  const navigate = useNavigate();

  // Once the fresh token exists, drop `?fresh` from the URL so a reload keeps this seat.
  useEffect(() => {
    if (fresh && token) void navigate({ to: "/room/$code", params: { code }, search: { fake }, replace: true });
  }, [fresh, token, code, fake, navigate]);
  const room = useQuery(api.rooms.getRoomView, token ? { code, token } : "skip");
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

  // Round presentation: "watching" = reveal or fight for a resolved round; "waiting" = ready, waiting for other.
  const [watched, setWatched] = useState<{ round: number; phase: "reveal" | "fight" | "waiting" | "done" } | null>(null);

  const showResultRound = room && (room.status === "REVEAL" || room.status === "FINISHED") ? room.roundNumber : null;
  const roundResult = useQuery(
    api.rounds.getRoundResult,
    showResultRound !== null ? { code, roundNumber: showResultRound } : "skip",
  );

  // When a new resolved round appears, start watching it from the reveal.
  useEffect(() => {
    if (showResultRound === null) return;
    if (!watched || watched.round !== showResultRound) setWatched({ round: showResultRound, phase: "reveal" });
  }, [showResultRound, watched]);

  const onRevealDone = useCallback(() => setWatched((w) => (w ? { ...w, phase: "fight" } : w)), []);

  const onFightDone = useCallback(async () => {
    if (!token || !room) return;
    if (room.status === "FINISHED") {
      setWatched((w) => (w ? { ...w, phase: "done" } : w));
      return;
    }
    setWatched((w) => (w ? { ...w, phase: "waiting" } : w));
    await readyForNextRound({ code, token, roundNumber: room.roundNumber });
  }, [token, room, code, readyForNextRound]);

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

  if (room.status === "IN_ROUND") return <ChooseMoveScreen {...session} fake={fake} />;

  // REVEAL or FINISHED: play the round once, then wait / show result.
  const result = roundResult?.result as CombatResult | undefined;
  if (!result || !watched || watched.round !== room.roundNumber) return <Centered><Sub>resolving…</Sub></Centered>;

  if (watched.phase === "reveal") return <RevealScreen result={result} onDone={onRevealDone} />;
  if (watched.phase === "fight") return <FightScreen result={result} onComplete={() => void onFightDone()} />;

  if (room.status === "FINISHED") return <ResultScreen {...session} lastResult={result} />;

  return (
    <Centered>
      <Title size="md">Round {room.roundNumber} done</Title>
      <Sub>waiting for {room.opponent?.nickname ?? "opponent"}…</Sub>
      {room.isHost && (
        <ArcadeButton tone="ghost" onClick={() => void forceNextRound({ code, token, roundNumber: room.roundNumber })}>
          Force next round
        </ArcadeButton>
      )}
    </Centered>
  );
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
