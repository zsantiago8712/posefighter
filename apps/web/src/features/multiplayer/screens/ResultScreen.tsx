import { api } from "@posefighter/backend/convex/_generated/api";
import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";

import type { RoomSession } from "../types";
import { ArcadeButton, FIGHTER_META, Screen, Sub, Title } from "../ui";

export function ResultScreen({ code, token, room, lastResult }: RoomSession & { lastResult: CombatResult | null }) {
  const rematch = useMutation(api.rooms.rematch);
  const navigate = useNavigate();

  const winner = room.players.find((p) => p.playerId === room.winnerPlayerId);
  const loser = room.players.find((p) => p.playerId !== room.winnerPlayerId);
  const iWon = room.me?.playerId === room.winnerPlayerId;

  const winnerPhoto =
    lastResult && winner
      ? lastResult.player1.playerId === winner.playerId
        ? lastResult.player1.posePhotoUrl
        : lastResult.player2.posePhotoUrl
      : undefined;

  return (
    <Screen className="justify-between gap-6">
      <div className="flex flex-col items-center gap-1 pt-4">
        <Sub>{iWon ? "victory" : "defeat"}</Sub>
        <Title size="xl">
          <span className={iWon ? "text-yellow-300" : "text-rose-500"}>{iWon ? "YOU WIN" : "K.O."}</span>
        </Title>
      </div>

      {winner && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-4 border-yellow-300 bg-gradient-to-br ${FIGHTER_META[winner.fighter].color} shadow-2xl shadow-yellow-400/40`}>
            {winnerPhoto ? (
              <img src={winnerPhoto} alt={`${winner.nickname} winning pose`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-8xl">{FIGHTER_META[winner.fighter].emoji}</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
              <div className="arcade text-4xl uppercase italic">{winner.nickname}</div>
              <div className="text-xs font-bold tracking-[0.3em] text-yellow-300">CHAMPION · {FIGHTER_META[winner.fighter].label}</div>
            </div>
          </div>
          {loser && (
            <Sub>
              defeats {loser.nickname} in {lastResult?.roundNumber ?? "?"} rounds
            </Sub>
          )}
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-3">
        <ArcadeButton big onClick={() => void rematch({ code, token })}>
          Rematch
        </ArcadeButton>
        <ArcadeButton tone="ghost" onClick={() => void navigate({ to: "/" })}>
          New battle
        </ArcadeButton>
      </div>
    </Screen>
  );
}
