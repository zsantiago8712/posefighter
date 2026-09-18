import { api } from "@posefighter/backend/convex/_generated/api";
import { COUNTDOWN_SECONDS, MOVES, type CaptureOutput, type Move } from "@posefighter/backend/convex/shared/contracts";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CaptureScreen } from "@/features/vision";

import { FakeMoveButtons } from "../FakeMoveButtons";
import { makeFakePhoto, uploadPhoto } from "../photoUpload";
import type { RoomSession } from "../types";
import { FighterBadge, MOVE_META, MOVE_NAMES, Sub } from "../ui";

/** If the camera never produces a result (permission denied, model failed, no video) we roll a random move. */
const CAPTURE_SAFETY_MS = (COUNTDOWN_SECONDS + 9) * 1000;
/** Below this confidence the classifier basically guessed; a random move is fairer than a silent BLOCK. */
const MIN_CONFIDENCE = 0.45;

/**
 * Round screen. Camera (VISION) on the left / full-screen on phones: 3·2·1 → snapshot → move locked → submit.
 * Nothing else to tap. If the camera fails or can't read the pose, a random move is submitted instead.
 * `?fake=1` swaps the camera for the five buttons (demo insurance).
 */
export function ChooseMoveScreen({ code, token, room, fake }: RoomSession & { fake: boolean }) {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const submitMove = useMutation(api.rounds.submitMove);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const me = room.me!;
  const opponent = room.opponent;

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

  const handleCapture = useCallback(
    (output: CaptureOutput) => {
      if (output.pose.confidence < MIN_CONFIDENCE) {
        const move = randomMove();
        void submit({ ...output, pose: { ...output.pose, move } }, `Couldn't read your pose → random: ${MOVE_META[move].label}`);
        return;
      }
      void submit(output);
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
  }, [fake, me.hasSubmitted, submitRandom]);

  const locked = me.hasSubmitted || submitting;

  return (
    <main
      className="grid h-dvh w-full grid-cols-1 bg-[#09090b] text-white lg:grid-cols-[minmax(0,1fr)_380px]"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      {/* LEFT: camera (or fake buttons) */}
      <section className="relative min-h-0 overflow-hidden bg-black">
        {locked ? (
          <LockedPanel me={me} opponentName={opponent?.nickname} opponentLocked={!!opponent?.hasSubmitted} submitting={submitting} note={note} />
        ) : fake ? (
          <div className="flex h-full items-center justify-center p-5">
            <FakeMoveButtons nickname={me.nickname} onCapture={(o) => void submit(o)} />
          </div>
        ) : (
          <CaptureScreen
            onCapture={handleCapture}
            countdownSeconds={COUNTDOWN_SECONDS}
            onError={(msg) => {
              console.warn("[capture] camera error:", msg);
              void submitRandom("Camera unavailable → random move");
            }}
          />
        )}

        {/* mobile header overlay */}
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
          <FighterBadge fighter={me.fighter} nickname={me.nickname} hp={me.hp} side="left" />
          <div className="arcade pt-1 text-center text-sm leading-none text-white/50">
            ROUND
            <br />
            <span className="text-3xl text-yellow-300">{room.roundNumber}</span>
          </div>
          {opponent && <FighterBadge fighter={opponent.fighter} nickname={opponent.nickname} hp={opponent.hp} side="right" />}
        </header>
      </section>

      {/* RIGHT (desktop only): status + legend */}
      <aside className="hidden min-h-0 flex-col gap-6 overflow-y-auto border-l border-white/10 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] p-6 lg:flex">
        <div className="flex flex-col gap-3">
          <FighterBadge fighter={me.fighter} nickname={me.nickname} hp={me.hp} side="left" />
          <div className="arcade text-center text-sm text-white/50">
            ROUND <span className="text-3xl text-yellow-300">{room.roundNumber}</span>
          </div>
          {opponent && <FighterBadge fighter={opponent.fighter} nickname={opponent.nickname} hp={opponent.hp} side="right" />}
        </div>

        <div className="flex flex-col gap-2">
          <Sub>strike a pose</Sub>
          {MOVES.map((m) => (
            <div key={m} className={`flex items-center gap-3 rounded-xl ${MOVE_META[m].color} px-3 py-2 text-black`}>
              <span className="text-2xl">{MOVE_META[m].emoji}</span>
              <div className="leading-tight">
                <div className="arcade text-lg uppercase italic">{MOVE_NAMES[me.fighter][m]}</div>
                <div className="text-[10px] font-bold tracking-widest opacity-70">{POSE_HINT[m]}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-auto text-center text-[10px] tracking-widest text-white/40 uppercase">
          {opponent?.hasSubmitted ? `${opponent.nickname} has locked in` : "opponent is posing…"}
        </p>
      </aside>
    </main>
  );
}

const POSE_HINT: Record<Move, string> = {
  PUNCH: "one arm straight out",
  BLOCK: "arms crossed on chest",
  DODGE: "lean hard to one side",
  HEAVY_ATTACK: "wide stance + arm out",
  SPECIAL: "both hands over head",
};

function randomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)]!;
}

function LockedPanel({
  me,
  opponentName,
  opponentLocked,
  submitting,
  note,
}: {
  me: RoomSession["room"]["players"][number] & { myMove: Move | null; myPower: number | null };
  opponentName?: string;
  opponentLocked: boolean;
  submitting: boolean;
  note: string | null;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] p-6 text-center">
      <h1 className="arcade text-5xl text-emerald-400 uppercase italic">Move locked ✓</h1>
      {me.myMove && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-7xl">{MOVE_META[me.myMove].emoji}</span>
          <span className="arcade text-4xl uppercase italic">{MOVE_NAMES[me.fighter][me.myMove]}</span>
          <Sub>
            {MOVE_META[me.myMove].label} · power {me.myPower}
          </Sub>
        </div>
      )}
      {note && <p className="max-w-xs text-xs font-bold tracking-wide text-orange-300 uppercase">{note}</p>}
      <p className="arcade mt-4 animate-pulse text-2xl text-white/70 italic">
        {submitting ? "Locking…" : opponentLocked ? "FIGHT!" : `Waiting for ${opponentName ?? "opponent"}…`}
      </p>
    </div>
  );
}
