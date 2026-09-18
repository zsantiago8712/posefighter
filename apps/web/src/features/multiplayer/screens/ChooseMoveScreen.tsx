import { api } from "@posefighter/backend/convex/_generated/api";
import type { CaptureOutput } from "@posefighter/backend/convex/shared/contracts";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";

import { FakeMoveButtons } from "../FakeMoveButtons";
import { uploadPhoto } from "../photoUpload";
import type { RoomSession } from "../types";
import { FighterBadge, MOVE_META, MOVE_NAMES, Screen, Sub, Title } from "../ui";

/**
 * CHOOSE YOUR MOVE → (capture) → MOVE LOCKED ✓ → waiting for opponent.
 *
 * INTEGRATION POINT (VISION): replace <FakeMoveButtons/> with <CaptureScreen onCapture={handleCapture}/>
 * when `fake` is false. Both produce a CaptureOutput; everything below is identical.
 */
export function ChooseMoveScreen({ code, token, room, fake }: RoomSession & { fake: boolean }) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const submitMove = useMutation(api.rounds.submitMove);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const me = room.me!;
  const opponent = room.opponent;

  async function handleCapture(output: CaptureOutput) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      let photoStorageId: Awaited<ReturnType<typeof uploadPhoto>> = null;
      try {
        const url = await generateUploadUrl();
        photoStorageId = await uploadPhoto(url, output.photo);
      } catch {
        photoStorageId = null; // never block the round on a photo
      }
      await submitMove({
        code,
        token,
        roundNumber: room.roundNumber,
        move: output.pose.move,
        power: Math.round(output.pose.power),
        confidence: output.pose.confidence,
        ...(photoStorageId ? { photoStorageId } : {}),
      });
    } catch (e) {
      submittedRef.current = false;
      setError("Could not lock your move. Try again.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const locked = me.hasSubmitted;

  return (
    <Screen className="gap-6">
      <header className="flex w-full max-w-md items-start gap-3">
        <FighterBadge fighter={me.fighter} nickname={me.nickname} hp={me.hp} side="left" />
        <div className="arcade pt-1 text-center text-sm leading-none text-white/50">
          ROUND
          <br />
          <span className="text-3xl text-yellow-300">{room.roundNumber}</span>
        </div>
        {opponent && <FighterBadge fighter={opponent.fighter} nickname={opponent.nickname} hp={opponent.hp} side="right" />}
      </header>

      {locked || submitting ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Title size="lg">
            <span className="text-emerald-400">Move locked ✓</span>
          </Title>
          {me.myMove && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-6xl">{MOVE_META[me.myMove].emoji}</span>
              <span className="arcade text-3xl uppercase italic">{MOVE_NAMES[me.fighter][me.myMove]}</span>
              <Sub>
                {MOVE_META[me.myMove].label} · power {me.myPower}
              </Sub>
            </div>
          )}
          <p className="arcade mt-6 animate-pulse text-2xl text-white/70 italic">
            {submitting ? "Locking…" : opponent?.hasSubmitted ? "Revealing…" : `Waiting for ${opponent?.nickname ?? "opponent"}…`}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          {fake ? (
            <FakeMoveButtons nickname={me.nickname} onCapture={handleCapture} />
          ) : (
            // TODO(VISION integration): <CaptureScreen onCapture={handleCapture} countdownSeconds={3} />
            <FakeMoveButtons nickname={me.nickname} onCapture={handleCapture} />
          )}
          {error && <p className="text-center text-sm font-bold text-rose-400">{error}</p>}
        </div>
      )}

      <footer className="text-center text-[10px] tracking-widest text-white/40 uppercase">
        {opponent?.hasSubmitted ? `${opponent.nickname} has locked in` : "opponent is choosing…"}
      </footer>
    </Screen>
  );
}
