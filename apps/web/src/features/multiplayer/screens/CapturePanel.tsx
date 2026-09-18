import { api } from "@posefighter/backend/convex/_generated/api";
import { COUNTDOWN_SECONDS, MOVES, type CaptureOutput, type Move } from "@posefighter/backend/convex/shared/contracts";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CaptureScreen } from "@/features/vision";

import { FakeMoveButtons } from "../FakeMoveButtons";
import { makeFakePhoto, uploadPhoto } from "../photoUpload";
import type { RoomSession } from "../types";
import { MOVE_META, MOVE_NAMES, Sub } from "../ui";

/** If the camera never produces a result (permission denied, model failed, no video) we roll a random move. */
const CAPTURE_SAFETY_MS = (COUNTDOWN_SECONDS + 17) * 1000;
/** Below this confidence we show a small "best guess" note next to the locked move. */
const LOW_CONFIDENCE = 0.3;

/**
 * The camera side of the battle screen. Mounted while the room is IN_ROUND.
 *   not submitted → CaptureScreen (3·2·1 → snapshot → classify) or FakeMoveButtons with ?fake=1
 *   submitted     → "MOVE LOCKED ✓ … waiting for opponent"
 * Camera error / unreadable pose / timeout → random move, so a round can never get stuck.
 */
export function CapturePanel({ code, token, room, fake, compact = false }: RoomSession & { fake: boolean; compact?: boolean }) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const submitMove = useMutation(api.rounds.submitMove);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const me = room.me!;
  const opponent = room.opponent;

  // New round → allow a new submission.
  useEffect(() => {
    submittedRef.current = false;
    setNote(null);
  }, [room.roundNumber]);

  const submit = useCallback(
    async (output: CaptureOutput, why?: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      if (why) setNote(why);
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
        setNote("Could not lock your move. Retrying…");
        console.error(e);
      } finally {
        setSubmitting(false);
      }
    },
    [code, token, room.roundNumber, generateUploadUrl, submitMove],
  );

  const submitRandom = useCallback(
    async (why: string) => {
      const move = randomMove();
      const photo = await makeFakePhoto(move, me.nickname);
      await submit({ pose: { move, confidence: 0, power: 50 + Math.floor(Math.random() * 30) }, photo }, why);
    },
    [me.nickname, submit],
  );

  // Always trust the classifier's move (the player saw it on screen at snapshot time). Low confidence only
  // gets a note; random moves are reserved for camera errors / timeouts.
  const handleCapture = useCallback(
    (output: CaptureOutput) => {
      const why = output.pose.confidence < LOW_CONFIDENCE ? "Pose was hard to read — used best guess" : undefined;
      void submit(output, why);
    },
    [submit],
  );

  // Safety net: the camera component never fires if permissions/model fail.
  useEffect(() => {
    if (fake || me.hasSubmitted) return;
    const t = setTimeout(() => {
      if (!submittedRef.current) void submitRandom("Camera didn't answer → random move");
    }, CAPTURE_SAFETY_MS);
    return () => clearTimeout(t);
  }, [fake, me.hasSubmitted, room.roundNumber, submitRandom]);

  const locked = me.hasSubmitted || submitting;

  if (locked) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] p-4 text-center">
        <h2 className={`arcade ${compact ? "text-2xl" : "text-4xl"} text-emerald-400 uppercase italic`}>Move locked ✓</h2>
        {me.myMove && (
          <div className="flex flex-col items-center gap-1">
            <span className={compact ? "text-4xl" : "text-7xl"}>{MOVE_META[me.myMove].emoji}</span>
            <span className={`arcade ${compact ? "text-xl" : "text-3xl"} uppercase italic`}>{MOVE_NAMES[me.fighter][me.myMove]}</span>
            {!compact && (
              <Sub>
                {MOVE_META[me.myMove].label} · power {me.myPower}
              </Sub>
            )}
          </div>
        )}
        {note && <p className="max-w-xs text-[10px] font-bold tracking-wide text-orange-300 uppercase">{note}</p>}
        <p className={`arcade animate-pulse ${compact ? "text-base" : "text-2xl"} text-white/70 italic`}>
          {submitting ? "Locking…" : opponent?.hasSubmitted ? "FIGHT!" : `Waiting for ${opponent?.nickname ?? "opponent"}…`}
        </p>
      </div>
    );
  }

  if (fake) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] p-4">
        <FakeMoveButtons nickname={me.nickname} onCapture={(o) => void submit(o)} />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <CaptureScreen
        key={room.roundNumber}
        onCapture={handleCapture}
        countdownSeconds={COUNTDOWN_SECONDS}
        onError={(msg) => {
          console.warn("[capture] camera error:", msg);
          void submitRandom("Camera unavailable → random move");
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-3 text-center">
        <span className="arcade text-sm tracking-widest text-yellow-300 uppercase">Round {room.roundNumber} · strike a pose</span>
      </div>
    </div>
  );
}

function randomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)]!;
}
