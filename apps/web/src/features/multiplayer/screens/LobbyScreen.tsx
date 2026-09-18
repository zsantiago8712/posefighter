import { api } from "@posefighter/backend/convex/_generated/api";
import { FIGHTERS, type Fighter } from "@posefighter/backend/convex/shared/contracts";
import { useMutation } from "convex/react";
import { useState } from "react";

import type { RoomSession } from "../types";
import { ArcadeButton, FIGHTER_META, Screen, Sub, TextInput } from "../ui";
import { friendlyError } from "./HomeScreen";

export function LobbyScreen({ code, token, room }: RoomSession) {
  const setProfile = useMutation(api.rooms.setProfile);
  const startBattle = useMutation(api.rooms.startBattle);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const me = room.me;
  const opponent = room.opponent;
  const link = typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : `/room/${code}`;

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

  async function onStart() {
    setError(null);
    try {
      await startBattle({ code, token });
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <Screen className="justify-between gap-6">
      <div className="flex flex-col items-center gap-1">
        <Sub>room code</Sub>
        <button type="button" onClick={share} className="arcade text-7xl tracking-[0.2em] text-yellow-300 italic select-all">
          {code}
        </button>
        <button type="button" onClick={share} className="text-xs font-bold tracking-widest text-white/50 underline uppercase">
          {copied ? "link copied ✓" : "share invite link"}
        </button>
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
              <Sub>choose your fighter</Sub>
              <div className="grid grid-cols-3 gap-3">
                {FIGHTERS.map((f: Fighter) => {
                  const meta = FIGHTER_META[f];
                  const selected = me.fighter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => void setProfile({ code, token, fighter: f })}
                      className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${meta.color} transition-all select-none ${selected ? `scale-105 ring-4 ring-yellow-300 shadow-xl ${meta.glow}` : "opacity-60 grayscale-[30%]"}`}
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

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <PlayerCard nickname={me?.nickname ?? "—"} fighter={me?.fighter ?? "BOXER"} present={!!me} />
          <span className="arcade text-4xl text-rose-500 italic">VS</span>
          <PlayerCard nickname={opponent?.nickname ?? "waiting…"} fighter={opponent?.fighter ?? "SAMURAI"} present={!!opponent} />
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {room.isHost ? (
          <ArcadeButton big onClick={onStart} disabled={!opponent}>
            {opponent ? "Start battle" : "Waiting for P2…"}
          </ArcadeButton>
        ) : (
          <p className="arcade animate-pulse text-center text-2xl text-white/70 italic">Waiting for host to start…</p>
        )}
        {error && <p className="text-center text-sm font-bold text-rose-400">{error}</p>}
      </div>
    </Screen>
  );
}

function PlayerCard({ nickname, fighter, present }: { nickname: string; fighter: Fighter; present: boolean }) {
  const meta = FIGHTER_META[fighter];
  return (
    <div className={`flex flex-col items-center gap-1 ${present ? "" : "opacity-40"}`}>
      <span className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.color} text-3xl ${present ? `shadow-lg ${meta.glow}` : "grayscale"}`}>
        {present ? meta.emoji : "?"}
      </span>
      <span className="arcade max-w-full truncate text-lg uppercase italic">{nickname}</span>
      <span className="text-[10px] font-bold tracking-widest text-white/50">{present ? meta.label : ""}</span>
    </div>
  );
}
