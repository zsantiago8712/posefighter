import { useCallback, useRef, useState } from "react";

import { type Classification, classify, smoothClassifications } from "./classify";
import { LM, type Point3, clamp01, dist2d, toPoint } from "./geometry";
import { useThresholds } from "./thresholds";
import { useCamera } from "./useCamera";
import { type PoseFrame, usePoseLandmarker } from "./usePoseLandmarker";

export const NO_PERSON_HINT = "Step back so we can see your arms";

interface WristSample {
  t: number;
  left: Point3;
  right: Point3;
  sw: number;
}

interface LiveState {
  frame: PoseFrame | null;
  classification: Classification | null;
  smoothed: Classification | null;
  speed: number;
}

interface Options {
  /** Camera on/off. */
  enabled?: boolean;
  /** Pose detection on/off (camera keeps running). */
  detect?: boolean;
}

/** Camera + MediaPipe + classifier + smoothing, exposed as one live state for CaptureScreen and /debug/vision. */
export function useLivePose({ enabled = true, detect = true }: Options = {}) {
  const thresholds = useThresholds();
  const thresholdsRef = useRef(thresholds);
  thresholdsRef.current = thresholds;

  const camera = useCamera(enabled);
  const [state, setState] = useState<LiveState>({ frame: null, classification: null, smoothed: null, speed: 0 });
  const stateRef = useRef(state);
  const historyRef = useRef<Classification[]>([]);
  const wristsRef = useRef<WristSample[]>([]);

  const onFrame = useCallback((frame: PoseFrame) => {
    const t = thresholdsRef.current;
    const aspect = frame.width / frame.height;
    let speed = 0;
    let classification: Classification | null = null;

    if (frame.landmarks) {
      const first = classify(frame.landmarks, { aspect, thresholds: t });
      if (first.features) {
        const sw = first.features.shoulderWidth;
        const left = toPoint(frame.landmarks[LM.L_WRIST]!, aspect, t.depthWeight);
        const right = toPoint(frame.landmarks[LM.R_WRIST]!, aspect, t.depthWeight);
        const samples = wristsRef.current;
        samples.push({ t: frame.timestamp, left, right, sw });
        const cutoff = frame.timestamp - t.speedWindowMs;
        while (samples.length > 1 && samples[1]!.t < cutoff) samples.shift();
        const oldest = samples[0]!;
        const moved = Math.max(dist2d(left, oldest.left), dist2d(right, oldest.right)) / sw;
        speed = clamp01(moved / t.speedReference);
      }
      classification = speed > 0 ? classify(frame.landmarks, { aspect, speed, thresholds: t }) : first;
    } else {
      classification = classify([], { aspect, thresholds: t });
      wristsRef.current = [];
    }

    const history = historyRef.current;
    history.push(classification);
    while (history.length > Math.max(1, t.smoothingFrames)) history.shift();
    const smoothed = smoothClassifications(history);

    const next = { frame, classification, smoothed, speed };
    stateRef.current = next;
    setState(next);
  }, []);

  const model = usePoseLandmarker(camera.videoRef, { enabled: enabled && detect && camera.status === "ready", onFrame });

  const getSmoothed = useCallback(() => stateRef.current.smoothed, []);
  const getFrame = useCallback(() => stateRef.current.frame, []);

  const hint = state.classification?.fallback ? NO_PERSON_HINT : null;

  return { videoRef: camera.videoRef, camera, model, ...state, hint, getSmoothed, getFrame };
}

export type LivePose = ReturnType<typeof useLivePose>;
