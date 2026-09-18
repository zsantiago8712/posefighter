import type { CaptureOutput, Move } from "@posefighter/backend/convex/shared/contracts";
import { COUNTDOWN_SECONDS } from "@posefighter/backend/convex/shared/contracts";
import { useEffect, useRef, useState } from "react";

import { type Classification, classify, toPoseResult } from "./classify";
import { DebugOverlay } from "./DebugOverlay";
import { blankSnapshot, captureSnapshot } from "./snapshot";
import { getThresholds } from "./thresholds";
import { useLivePose } from "./useLivePose";

export interface CaptureScreenProps {
  /** Fires exactly once per mount, after the countdown, with the classified pose and JPEG snapshot. */
  onCapture: (output: CaptureOutput) => void;
  countdownSeconds?: number;
  debug?: boolean;
  /** Camera and pose model are both ready; the countdown starts right after. */
  onReady?: () => void;
  onError?: (message: string) => void;
}

type Phase = "loading" | "countdown" | "pose" | "locked";

const MOVE_LABEL: Record<Move, string> = {
  PUNCH: "PUNCH",
  BLOCK: "BLOCK",
  DODGE: "DODGE",
  HEAVY_ATTACK: "HEAVY ATTACK",
  SPECIAL: "SPECIAL",
};

export function CaptureScreen(props: CaptureScreenProps) {
  const [mountKey, setMountKey] = useState(0);
  return <CaptureScreenInner key={mountKey} {...props} onRetry={() => setMountKey((k) => k + 1)} />;
}

function CaptureScreenInner({
  onCapture,
  countdownSeconds = COUNTDOWN_SECONDS,
  debug = false,
  onReady,
  onError,
  onRetry,
}: CaptureScreenProps & { onRetry: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [count, setCount] = useState(countdownSeconds);
  const [result, setResult] = useState<Classification | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const firedRef = useRef(false);
  const readyRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  const live = useLivePose({ enabled: true, detect: phase !== "locked" });
  const { camera, model } = live;
  const isReady = camera.status === "ready" && model.status === "ready";
  const errorMessage = camera.error ?? model.error;

  useEffect(() => {
    if (phase === "loading" && isReady && !readyRef.current) {
      readyRef.current = true;
      onReady?.();
      setCount(countdownSeconds);
      setPhase("countdown");
    }
  }, [phase, isReady, countdownSeconds, onReady]);

  useEffect(() => {
    if (errorMessage && errorRef.current !== errorMessage) {
      errorRef.current = errorMessage;
      onError?.(errorMessage);
    }
  }, [errorMessage, onError]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      setPhase("pose");
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "pose") return;
    const t = getThresholds();
    let cancelled = false;
    const timers: number[] = [];

    timers.push(
      window.setTimeout(async () => {
        if (cancelled || firedRef.current) return;
        const video = live.videoRef.current;
        const classification = live.getSmoothed() ?? classify([], { thresholds: t });
        let photo: Blob;
        try {
          if (!video) throw new Error("no video");
          photo = await captureSnapshot(video, { maxWidth: 720, quality: 0.8, mirror: true });
        } catch (e) {
          console.warn("[vision] snapshot failed, using blank photo", e);
          photo = await blankSnapshot();
        }
        if (cancelled) return;
        setResult(classification);
        setPhotoUrl(URL.createObjectURL(photo));
        setPhase("locked");
        timers.push(
          window.setTimeout(() => {
            if (cancelled || firedRef.current) return;
            firedRef.current = true;
            onCapture({ pose: toPoseResult(classification), photo });
          }, t.lockedDisplayMs),
        );
      }, t.poseHoldMs),
    );

    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
    };
  }, [phase, live.videoRef, live.getSmoothed, onCapture]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const lowConfidence = result !== null && result.confidence < 0.5;

  return (
    <div
      className="relative h-full min-h-0 w-full touch-none select-none overflow-hidden bg-black text-white"
      style={{ overscrollBehavior: "none" }}
      onPointerDown={camera.play}
    >
      <style>{`@keyframes pf-flash{0%{opacity:1}100%{opacity:0}}@keyframes pf-pop{0%{transform:scale(1.6);opacity:0}30%{opacity:1}100%{transform:scale(1);opacity:1}}`}</style>

      <video
        ref={live.videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />

      {debug ? (
        <DebugOverlay
          frame={live.frame}
          classification={live.classification}
          smoothed={live.smoothed}
          connections={model.connections}
          fps={model.fps}
          delegate={model.delegate}
          speed={live.speed}
        />
      ) : null}

      {phase === "loading" && !errorMessage ? (
        <Center>
          <h1 className="animate-pulse text-6xl font-black italic tracking-tighter uppercase drop-shadow-[0_0_24px_rgba(34,211,238,0.9)]">
            Get ready
          </h1>
          <p className="mt-3 font-mono text-sm text-cyan-200">
            {camera.status !== "ready" ? "starting camera…" : "loading pose model…"}
          </p>
        </Center>
      ) : null}

      {errorMessage ? (
        <Center className="bg-black/80 px-6">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-red-400">Camera problem</h1>
          <p className="mt-3 max-w-sm text-center text-base text-white/90">{errorMessage}</p>
          <p className="mt-2 max-w-sm text-center text-xs text-white/60">
            On iPhone: Settings → Safari → Camera → Allow. The page must be opened over HTTPS.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 h-14 rounded-xl bg-yellow-400 px-8 text-lg font-black tracking-wide text-black uppercase active:scale-95"
          >
            Retry
          </button>
        </Center>
      ) : null}

      {phase === "countdown" ? (
        <Center>
          <div
            key={count}
            className="text-[min(45vw,16rem)] leading-none font-black italic tracking-tighter text-yellow-300 drop-shadow-[0_0_40px_rgba(250,204,21,0.8)]"
            style={{ animation: "pf-pop 0.5s ease-out" }}
          >
            {count}
          </div>
          <p className="mt-2 text-2xl font-black tracking-widest uppercase">Strike a pose</p>
        </Center>
      ) : null}

      {phase === "countdown" || phase === "pose" ? <LiveMoveBadge current={live.smoothed} hint={live.hint} /> : null}

      {phase === "pose" ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "pf-flash 0.5s ease-out forwards" }} />
          <Center>
            <div className="text-[min(35vw,12rem)] leading-none font-black italic tracking-tighter text-fuchsia-400 drop-shadow-[0_0_40px_rgba(232,121,249,0.9)]">
              POSE!
            </div>
          </Center>
        </>
      ) : null}

      {phase === "locked" && result ? (
        <>
          {photoUrl ? (
            <img src={photoUrl} alt="Your pose" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="text-lg font-black tracking-[0.3em] text-lime-300 uppercase">Move locked ✓</div>
            <div className="text-5xl font-black italic tracking-tighter text-yellow-300 uppercase drop-shadow-[0_0_24px_rgba(250,204,21,0.8)]">
              {MOVE_LABEL[result.move]}
            </div>
            <div className="font-mono text-base text-white/90">
              POWER {result.power} · CONF {Math.round(result.confidence * 100)}%
            </div>
            {lowConfidence ? (
              <div className="mt-1 text-xs text-orange-300 uppercase">
                {result.fallback ? live.hint ?? "We couldn't see you clearly" : "Ambiguous pose"}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Center({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center ${className}`}>
      {children}
    </div>
  );
}

/** What the classifier currently reads, so the player knows which move will lock when the timer ends. */
function LiveMoveBadge({ current, hint }: { current: Classification | null; hint: string | null }) {
  const pct = current ? Math.round(current.confidence * 100) : 0;
  const solid = current !== null && !current.fallback && current.confidence >= 0.5;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {hint ? (
        <div className="rounded-full bg-orange-500/90 px-4 py-2 text-sm font-bold tracking-wide text-black uppercase">{hint}</div>
      ) : (
        <>
          <div className="text-xs font-bold tracking-[0.3em] text-white/60 uppercase">Your move</div>
          <div
            className={`text-5xl font-black italic tracking-tighter uppercase transition-colors ${
              solid ? "text-yellow-300 drop-shadow-[0_0_24px_rgba(250,204,21,0.8)]" : "text-white/50"
            }`}
          >
            {current ? MOVE_LABEL[current.move] : "…"}
          </div>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-white/15">
            <div className={`h-full transition-all ${solid ? "bg-yellow-300" : "bg-orange-400"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="font-mono text-sm text-white/80">
            {pct}% · POWER {current?.power ?? "—"}
          </div>
        </>
      )}
    </div>
  );
}
