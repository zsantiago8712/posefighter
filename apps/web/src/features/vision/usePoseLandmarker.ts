import { type RefObject, useEffect, useRef, useState } from "react";

import type { Connection, Landmark } from "./geometry";

type PoseLandmarker = import("@mediapipe/tasks-vision").PoseLandmarker;

const MEDIAPIPE_VERSION = "1.0.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export type Delegate = "GPU" | "CPU";
export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface LoadedModel {
  landmarker: PoseLandmarker;
  delegate: Delegate;
  connections: Connection[];
}

let loaded: Promise<LoadedModel> | null = null;

/** Module-level singleton so the second mount (next round) reuses the WASM + model. */
export function loadPoseLandmarker(forceCpu = false): Promise<LoadedModel> {
  if (loaded && !forceCpu) return loaded;
  const previous = loaded;
  loaded = (async () => {
    if (previous) {
      await previous.then((m) => m.landmarker.close()).catch(() => {});
    }
    const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const create = (delegate: Delegate) =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    const connections = PoseLandmarker.POSE_CONNECTIONS;
    if (!forceCpu) {
      try {
        return { landmarker: await create("GPU"), delegate: "GPU" as const, connections };
      } catch (e) {
        console.warn("[vision] GPU delegate failed, falling back to CPU", e);
      }
    }
    return { landmarker: await create("CPU"), delegate: "CPU" as const, connections };
  })();
  loaded.catch(() => {
    loaded = null;
  });
  return loaded;
}

export interface PoseFrame {
  landmarks: Landmark[] | null;
  timestamp: number;
  width: number;
  height: number;
}

interface Options {
  enabled: boolean;
  onFrame: (frame: PoseFrame) => void;
}

/** Runs detectForVideo on every new video frame via requestAnimationFrame; pauses while the tab is hidden. */
export function usePoseLandmarker(videoRef: RefObject<HTMLVideoElement | null>, { enabled, onFrame }: Options) {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [delegate, setDelegate] = useState<Delegate | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let model: LoadedModel | null = null;
    let lastVideoTime = -1;
    let lastTs = 0;
    let smoothedFps = 0;
    let lastFpsPublish = 0;
    let recovering = false;

    setStatus("loading");
    setError(null);

    const loop = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      if (!model || !video || document.hidden || video.readyState < 2 || video.videoWidth === 0) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      const ts = Math.max(now, lastTs + 1);
      let landmarks: Landmark[] | null = null;
      try {
        const result = model.landmarker.detectForVideo(video, ts);
        landmarks = result.landmarks[0] ?? null;
      } catch (e) {
        if (model.delegate === "GPU" && !recovering) {
          recovering = true;
          console.warn("[vision] GPU inference failed, reloading on CPU", e);
          model = null;
          loadPoseLandmarker(true)
            .then((m) => {
              if (cancelled) return;
              model = m;
              setDelegate(m.delegate);
              recovering = false;
            })
            .catch((err) => {
              if (cancelled) return;
              setStatus("error");
              setError(err instanceof Error ? err.message : "Pose model failed.");
            });
        } else if (!recovering) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Pose inference failed.");
        }
        return;
      }

      if (lastTs > 0) {
        const inst = 1000 / (ts - lastTs);
        smoothedFps = smoothedFps === 0 ? inst : smoothedFps * 0.9 + inst * 0.1;
        if (now - lastFpsPublish > 500) {
          lastFpsPublish = now;
          setFps(Math.round(smoothedFps));
        }
      }
      lastTs = ts;

      onFrameRef.current({ landmarks, timestamp: ts, width: video.videoWidth, height: video.videoHeight });
    };

    loadPoseLandmarker()
      .then((m) => {
        if (cancelled) return;
        model = m;
        setDelegate(m.delegate);
        setConnections(m.connections);
        setStatus("ready");
        raf = requestAnimationFrame(loop);
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Could not load the pose model.");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, videoRef]);

  return { status, delegate, connections, error, fps };
}
