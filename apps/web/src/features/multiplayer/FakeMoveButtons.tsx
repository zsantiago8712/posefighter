import { MOVES, type CaptureOutput, type Move } from "@posefighter/backend/convex/shared/contracts";
import { useState } from "react";

import { makeFakePhoto } from "./photoUpload";
import { MOVE_META, Sub, Title } from "./ui";

/**
 * Dev / demo-insurance input. Produces the same CaptureOutput the real <CaptureScreen/> will,
 * so the submit path downstream is identical.
 */
export function FakeMoveButtons({ nickname, onCapture }: { nickname: string; onCapture: (o: CaptureOutput) => void }) {
  const [power, setPower] = useState(75);
  const [busy, setBusy] = useState<Move | null>(null);

  async function pick(move: Move) {
    if (busy) return;
    setBusy(move);
    const photo = await makeFakePhoto(move, nickname);
    onCapture({ pose: { move, confidence: 0.99, power }, photo });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Title size="md">Choose your move</Title>
      <Sub>fake input · no camera</Sub>
      <div className="grid grid-cols-2 gap-3">
        {MOVES.map((m) => {
          const meta = MOVE_META[m];
          return (
            <button
              key={m}
              type="button"
              disabled={busy !== null}
              onClick={() => pick(m)}
              className={`arcade flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl ${meta.color} text-black shadow-[0_6px_0_rgba(0,0,0,0.7)] transition-transform select-none active:translate-y-1 disabled:opacity-40 ${m === "SPECIAL" ? "col-span-2" : ""}`}
            >
              <span className="text-3xl">{meta.emoji}</span>
              <span className="text-2xl tracking-wider uppercase italic">{meta.label}</span>
              <span className="text-[10px] font-bold tracking-widest opacity-70">{meta.hint}</span>
            </button>
          );
        })}
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold tracking-widest text-white/60 uppercase">
        <span>
          Power <span className="text-yellow-300">{power}</span>
        </span>
        <input type="range" min={0} max={100} value={power} onChange={(e) => setPower(Number(e.target.value))} className="accent-yellow-400" />
      </label>
    </div>
  );
}
