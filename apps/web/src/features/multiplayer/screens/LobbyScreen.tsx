import { api } from "@posefighter/backend/convex/_generated/api";
import { FIGHTERS, type Fighter } from "@posefighter/backend/convex/shared/contracts";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { unlockAudio } from "@/game";

import { PoseGuide } from "../PoseGuide";
import type { RoomSession } from "../types";
import { FIGHTER_META, Screen, Sub, TextInput } from "../ui";

/**
 * Lobby: code + fighter pick. There is NO start button: tapping a fighter marks you READY, and as soon as
 * both players are ready the host's client starts the battle → straight into round 1.
 */
export function LobbyScreen({ code, token, room }: RoomSession) {
  const setProfile = useMutation(api.rooms.setProfile);
  const startBattle = useMutation(api.rooms.startBattle);
  const heartbeat = useMutation(api.rooms.heartbeat);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  const me = room.me;
  const opponent = room.opponent;
  const bothReady = !!me?.ready && !!opponent?.ready;
  const link = typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : `/room/${code}`;

  // Presence ping while in the lobby so Quick Match only pairs people into lobbies that are still open.
  useEffect(() => {
    void heartbeat({ code, token });
    const id = setInterval(() => void heartbeat({ code, token }), 10_000);
    return () => clearInterval(id);
  }, [code, token, heartbeat]);

  // Auto-start once both fighters are picked (host drives it; mutation is idempotent).
  useEffect(() => {
    if (!room.isHost || !bothReady || startedRef.current) return;
    startedRef.current = true;
    startBattle({ code, token }).catch(() => {
      startedRef.current = false;
    });
  }, [room.isHost, bothReady, code, token, startBattle]);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "POSE FIGHT", text: `Fight me! Room ${code}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Screen className="justify-between gap-6">
      <div className="flex flex-col items-center gap-1">
        {room.isPublic && !opponent && (
          <div className="mb-2 flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-1.5">
            <span className="size-2 animate-ping rounded-full bg-yellow-300" />
            <span className="text-[11px] font-bold tracking-widest text-yellow-200 uppercase">Quick match · searching for an opponent…</span>
          </div>
        )}
        <Sub>room code</Sub>
        <button type="button" onClick={share} className="arcade text-7xl tracking-[0.2em] text-yellow-300 italic select-all">
          {code}
        </button>
        <button type="button" onClick={share} className="text-xs font-bold tracking-widest text-white/50 underline uppercase">
          {copied ? "link copied ✓" : "share invite link"}
        </button>
        {room.isHost && !opponent && (
          <button
            type="button"
            onClick={() => window.open(`${link}?fresh=1`, "_blank")}
            className="mt-1 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold tracking-widest text-white/60 uppercase"
          >
            🕹️ open player 2 in a new tab (same pc)
          </button>
        )}
      </div>

      <div className="flex w-full max-w-md flex-col gap-5">
        {me && (
          <>
            <label className="flex flex-col gap-2">
              <Sub>your name</Sub>
              <TextInput
                defaultValue={me.nickname}
                maxLength={12}
                autoCapitalize="characters"
                onBlur={(e) => {
                  const nickname = e.target.value.trim().toUpperCase();
                  if (nickname && nickname !== me.nickname) void setProfile({ code, token, nickname });
                }}
              />
            </label>

            <div className="flex flex-col gap-2">
              <Sub>{me.ready ? "fighter locked ✓" : "tap your fighter to lock in"}</Sub>
              <div className="grid grid-cols-3 gap-3">
                {FIGHTERS.map((f: Fighter) => {
                  const meta = FIGHTER_META[f];
                  const selected = me.ready && me.fighter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        unlockAudio(); // user gesture → audio allowed for the whole battle
                        void setProfile({ code, token, fighter: f, ready: true });
                      }}
                      className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${meta.color} transition-all select-none ${selected ? `scale-105 ring-4 ring-yellow-300 shadow-xl ${meta.glow}` : "opacity-70"}`}
                    >
                      <span className="text-4xl">{meta.emoji}</span>
                      <span className="arcade text-lg tracking-wider uppercase italic">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {me && <PoseGuide fighter={me.fighter} />}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <PlayerCard nickname={me?.nickname ?? "—"} fighter={me?.fighter ?? "BOXER"} present={!!me} ready={!!me?.ready} />
          <span className="arcade text-4xl text-rose-500 italic">VS</span>
          <PlayerCard nickname={opponent?.nickname ?? "waiting…"} fighter={opponent?.fighter ?? "SAMURAI"} present={!!opponent} ready={!!opponent?.ready} />
        </div>
      </div>

      <p className="arcade animate-pulse text-center text-2xl text-white/70 italic">
        {bothReady
          ? "FIGHT!"
          : !opponent
            ? room.isPublic
              ? "Finding a random fighter… share the code to skip the wait"
              : "Waiting for player 2…"
            : !me?.ready
              ? "Pick your fighter!"
              : `Waiting for ${opponent.nickname} to pick…`}
      </p>
    </Screen>
  );
}

function PlayerCard({ nickname, fighter, present, ready }: { nickname: string; fighter: Fighter; present: boolean; ready: boolean }) {
  const meta = FIGHTER_META[fighter];
  return (
    <div className={`flex flex-col items-center gap-1 ${present ? "" : "opacity-40"}`}>
      <span className={`relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.color} text-3xl ${present ? `shadow-lg ${meta.glow}` : "grayscale"}`}>
        {present ? meta.emoji : "?"}
        {ready && <span className="absolute -top-1 -right-1 rounded-full bg-emerald-400 px-1 text-[10px] font-black text-black">✓</span>}
      </span>
      <span className="arcade max-w-full truncate text-lg uppercase italic">{nickname}</span>
      <span className="text-[10px] font-bold tracking-widest text-white/50">{present ? (ready ? meta.label : "picking…") : ""}</span>
    </div>
  );
}
