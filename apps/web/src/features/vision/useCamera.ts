import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function describeError(e: unknown): { status: CameraStatus; message: string } {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return { status: "denied", message: "Camera access was denied. Allow the camera in your browser settings and retry." };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { status: "error", message: "No front camera found on this device." };
  }
  if (name === "NotReadableError") {
    return { status: "error", message: "The camera is busy in another app. Close it and retry." };
  }
  return { status: "error", message: e instanceof Error ? e.message : "Could not start the camera." };
}

/** Front camera stream attached to `videoRef`. Tracks stop on unmount or when `enabled` turns false. */
export function useCamera(enabled = true) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    setStatus("requesting");
    setError(null);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not available. On phones the page must be served over HTTPS.");
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        const video = videoRef.current;
        if (!video) throw new Error("Video element not mounted.");
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        const { status: s, message } = describeError(e);
        setStatus(s);
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      stopStream(stream);
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  /** iOS may refuse autoplay until a gesture; call this from a tap handler. */
  const play = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return { videoRef, status, error, retry, play };
}
