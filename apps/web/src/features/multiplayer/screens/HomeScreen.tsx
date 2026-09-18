import { api } from "@posefighter/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

import { getSavedNickname, saveNickname, usePlayerToken } from "../usePlayerToken";
import { ArcadeButton, Screen, Sub, TextInput, Title } from "../ui";

export function HomeScreen() {
  const token = usePlayerToken();
  const navigate = useNavigate();
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const quickMatch = useMutation(api.rooms.quickMatch);

  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(getSavedNickname());
  }, []);

  function nick() {
    const n = nickname.trim().slice(0, 12).toUpperCase() || "FIGHTER";
    saveNickname(n);
    return n;
  }

  async function onCreate() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { code } = await createRoom({ token, nickname: nick() });
      await navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setBusy(false);
    }
  }

  async function onQuickMatch() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { code } = await quickMatch({ token, nickname: nick() });
      await navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }

  async function onJoin() {
    if (!token || busy || code.trim().length < 4) return;
    setBusy(true);
    setError(null);
    try {
      const res = await joinRoom({ code: code.trim().toUpperCase(), token, nickname: nick() });
      await navigate({ to: "/room/$code", params: { code: res.code } });
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }

  return (
    <Screen className="justify-between">
      <div className="flex flex-col items-center gap-2 pt-10">
        <Sub>your body is your controller</Sub>
        <Title size="xl">
          <span className="text-yellow-300">POSE</span> <span className="text-rose-500">FIGHT</span>
        </Title>
      </div>

      <div className="flex w-full max-w-md flex-col gap-6">
        <label className="flex flex-col gap-2">
          <Sub>nickname</Sub>
          <TextInput value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="SANTI" maxLength={12} autoCapitalize="characters" />
        </label>

        <ArcadeButton big onClick={onQuickMatch} disabled={!token || busy}>
          ⚡ Quick match
        </ArcadeButton>
        <p className="-mt-3 text-center text-[10px] tracking-widest text-white/40 uppercase">fight a random opponent</p>

        <ArcadeButton tone="ghost" onClick={onCreate} disabled={!token || busy}>
          Create private battle
        </ArcadeButton>

        <div className="flex items-center gap-3 text-white/40">
          <hr className="flex-1 border-white/20" />
          <span className="arcade text-lg">or</span>
          <hr className="flex-1 border-white/20" />
        </div>

        <div className="flex flex-col gap-3">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
            placeholder="ROOM CODE"
            maxLength={4}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <ArcadeButton tone="ghost" onClick={onJoin} disabled={!token || busy || code.length < 4}>
            Join battle
          </ArcadeButton>
        </div>

        {error && <p className="text-center text-sm font-bold text-rose-400">{error}</p>}
      </div>

      <p className="text-center text-[10px] tracking-widest text-white/30 uppercase">boxer · samurai · wizard</p>
    </Screen>
  );
}

export function friendlyError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e);
  if (msg.includes("ROOM_NOT_FOUND")) return "Room not found. Check the code.";
  if (msg.includes("ROOM_FULL")) return "That room is full.";
  if (msg.includes("BATTLE_ALREADY_STARTED")) return "That battle already started.";
  if (msg.includes("NEED_TWO_PLAYERS")) return "Waiting for a second fighter.";
  return "Something went wrong. Try again.";
}
