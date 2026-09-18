import { useEffect, useRef, useState } from "react";

import { unlockAudio } from "@/game";

import { ArcadeButton, Sub } from "./ui";

type State = "idle" | "requesting" | "ok" | "insecure" | "denied" | "busy" | "none" | "error";

const SESSION_KEY = "posefight.cameraOk";

/**
 * Lobby camera check. Requests the front camera INSIDE a tap (mobile browsers are far more reliable that way),
 * shows a live preview so the player knows it works, and explains every failure in plain words.
 * The same tap also unlocks audio for the whole battle.
 */
export function CameraCheck({ compact = false }: { compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.isSecureContext) setState("insecure");
    else if (window.sessionStorage.getItem(SESSION_KEY) === "1") setState("ok");
    return () => stop();
  }, []);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function enable() {
    unlockAudio();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("insecure");
      return;
    }
    setState("requesting");
    setDetail(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setState("ok");
      // Keep the preview for a moment, then release the camera so the round can grab it cleanly.
      setTimeout(stop, 2500);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") setState("denied");
      else if (name === "NotReadableError" || name === "AbortError") setState("busy");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setState("none");
      else setState("error");
      setDetail(e instanceof Error ? `${name || "Error"}: ${e.message}` : String(e));
    }
  }

  const msg: Record<State, string> = {
    idle: "The camera is your controller. Enable it now so the first round starts instantly.",
    requesting: "Asking for permission… tap ALLOW on the prompt.",
    ok: "Camera ready ✓",
    insecure: "Camera needs HTTPS. Open the game from the https:// link (not an IP address).",
    denied: "Camera blocked. iPhone: Settings → Safari → Camera → Allow (or tap 'AA' in the address bar → Website Settings). Android: tap the lock icon → Permissions → Camera → Allow. Then reload.",
    busy: "The camera is in use by another app or tab. Close it and try again.",
    none: "No front camera found on this device.",
    error: "Could not start the camera.",
  };

  const bad = state === "insecure" || state === "denied" || state === "busy" || state === "none" || state === "error";

  return (
    <div className={`flex w-full flex-col items-center gap-2 rounded-2xl border ${state === "ok" ? "border-emerald-400/40 bg-emerald-400/10" : bad ? "border-rose-500/50 bg-rose-500/10" : "border-white/10 bg-black/40"} p-3`}>
      <div className="flex w-full items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
          {state !== "requesting" && !streamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center text-2xl">{state === "ok" ? "✅" : bad ? "🚫" : "📷"}</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Sub>camera</Sub>
          <p className={`text-xs leading-snug font-semibold ${bad ? "text-rose-200" : state === "ok" ? "text-emerald-200" : "text-white/80"}`}>{msg[state]}</p>
          {detail && bad && <p className="truncate font-mono text-[9px] text-white/40">{detail}</p>}
        </div>
      </div>
      {state !== "ok" && (
        <ArcadeButton onClick={() => void enable()} disabled={state === "requesting"} className={compact ? "min-h-12 text-base" : ""}>
          {state === "idle" ? "📷 Enable camera" : "Try again"}
        </ArcadeButton>
      )}
    </div>
  );
}
