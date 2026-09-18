import type { Move, PoseResult } from "@posefighter/backend/convex/shared/contracts";

import {
  KEY_LANDMARKS,
  LANDMARK_COUNT,
  LM,
  type Landmark,
  type Point3,
  angleDeg,
  angleFromDownDeg,
  clamp,
  clamp01,
  dist,
  dist2d,
  leanDeg,
  mean,
  midpoint,
  toPoint,
} from "./geometry";
import { DEFAULT_THRESHOLDS, type Thresholds } from "./thresholds";

export const MOVE_PRIORITY: Move[] = ["SPECIAL", "BLOCK", "DODGE", "HEAVY_ATTACK", "PUNCH"];

export interface PoseFeatures {
  shoulderWidth: number;
  visibility: number;
  leftElbowDeg: number;
  rightElbowDeg: number;
  leftReach: number;
  rightReach: number;
  leftArmAngleDeg: number;
  rightArmAngleDeg: number;
  leftWristAboveNose: number;
  rightWristAboveNose: number;
  wristDistance: number;
  leanDeg: number;
  shoulderHipOffset: number;
  leftWristSideways: number;
  rightWristSideways: number;
  hipsLevel: number;
  feetVisible: number;
  ankleSpread: number | null;
}

export interface Classification extends PoseResult {
  /** 0..1 per move; >= 0.5 means that move's rule matched. */
  scores: Record<Move, number>;
  features: PoseFeatures | null;
  /** True when nobody (or too little of somebody) was visible. */
  fallback: boolean;
}

export interface ClassifyOptions {
  /** frameWidth / frameHeight of the source video. */
  aspect?: number;
  /** 0..1 — normalized wrist speed just before the snapshot, tracked by the caller. */
  speed?: number;
  thresholds?: Thresholds;
}

const scoreFromMargin = (margin: number) => clamp01(0.5 + 0.5 * clamp(margin, -1, 1));

export function extractFeatures(landmarks: Landmark[], aspect: number, t: Thresholds): PoseFeatures | null {
  if (landmarks.length < LANDMARK_COUNT) return null;

  const visibility = mean(KEY_LANDMARKS.map((i) => landmarks[i]?.visibility ?? 0));
  const p = (i: number): Point3 => toPoint(landmarks[i]!, aspect, t.depthWeight);

  const nose = p(LM.NOSE);
  const lSh = p(LM.L_SHOULDER);
  const rSh = p(LM.R_SHOULDER);
  const lEl = p(LM.L_ELBOW);
  const rEl = p(LM.R_ELBOW);
  const lWr = p(LM.L_WRIST);
  const rWr = p(LM.R_WRIST);
  const lHip = p(LM.L_HIP);
  const rHip = p(LM.R_HIP);

  const sw = Math.max(dist2d(lSh, rSh), 1e-3);
  const shoulderCenter = midpoint(lSh, rSh);
  const hipCenter = midpoint(lHip, rHip);

  const lAnkleVis = landmarks[LM.L_ANKLE]?.visibility ?? 0;
  const rAnkleVis = landmarks[LM.R_ANKLE]?.visibility ?? 0;
  const feetVisible = clamp01(mean([lAnkleVis, rAnkleVis]));
  const ankleSpread =
    lAnkleVis > t.minVisibility && rAnkleVis > t.minVisibility
      ? dist2d(p(LM.L_ANKLE), p(LM.R_ANKLE)) / sw
      : null;

  return {
    shoulderWidth: sw,
    visibility,
    leftElbowDeg: angleDeg(lSh, lEl, lWr),
    rightElbowDeg: angleDeg(rSh, rEl, rWr),
    leftReach: dist(lSh, lWr) / sw,
    rightReach: dist(rSh, rWr) / sw,
    leftArmAngleDeg: angleFromDownDeg(lSh, lWr),
    rightArmAngleDeg: angleFromDownDeg(rSh, rWr),
    leftWristAboveNose: (nose.y - lWr.y) / sw,
    rightWristAboveNose: (nose.y - rWr.y) / sw,
    wristDistance: dist2d(lWr, rWr) / sw,
    leanDeg: leanDeg(shoulderCenter, hipCenter),
    shoulderHipOffset: (shoulderCenter.x - hipCenter.x) / sw,
    leftWristSideways: Math.abs(lWr.x - shoulderCenter.x) / sw,
    rightWristSideways: Math.abs(rWr.x - shoulderCenter.x) / sw,
    hipsLevel: 1 - clamp01(Math.abs(lHip.y - rHip.y) / sw / 0.3),
    feetVisible,
    ankleSpread,
  };
}

function blockMargin(landmarks: Landmark[], f: PoseFeatures, aspect: number, t: Thresholds): number {
  const p = (i: number) => toPoint(landmarks[i]!, aspect, t.depthWeight);
  const lSh = p(LM.L_SHOULDER);
  const rSh = p(LM.R_SHOULDER);
  const sw = f.shoulderWidth;
  const xMin = Math.min(lSh.x, rSh.x) - t.blockHorizontalTolerance * sw;
  const xMax = Math.max(lSh.x, rSh.x) + t.blockHorizontalTolerance * sw;
  const yTop = (lSh.y + rSh.y) / 2 - t.blockVerticalTolerance * sw;
  const yBottom = (p(LM.L_HIP).y + p(LM.R_HIP).y) / 2;

  const margins: number[] = [];
  for (const w of [p(LM.L_WRIST), p(LM.R_WRIST)]) {
    margins.push(Math.min(w.x - xMin, xMax - w.x) / sw / t.blockScale);
    margins.push(Math.min(w.y - yTop, yBottom - w.y) / sw / t.blockScale);
  }
  margins.push((t.blockMaxWristDistance - f.wristDistance) / t.blockScale);
  return Math.min(...margins);
}

/** An attacking arm is straight, reaches far, and is raised away from hanging down. */
function armMargins(f: PoseFeatures, t: Thresholds) {
  const extended = (elbow: number, reach: number, armAngle: number) =>
    Math.min(
      (elbow - t.extendedElbowDeg) / t.elbowScale,
      (reach - t.extendedReach) / t.reachScale,
      (armAngle - t.attackArmAngleDeg) / t.attackArmAngleScale,
    );

  const leftExt = extended(f.leftElbowDeg, f.leftReach, f.leftArmAngleDeg);
  const rightExt = extended(f.rightElbowDeg, f.rightReach, f.rightArmAngleDeg);
  const leftIsPrimary = leftExt >= rightExt;
  const otherExt = leftIsPrimary ? rightExt : leftExt;
  return {
    primaryExt: leftIsPrimary ? leftExt : rightExt,
    otherExt,
    otherNotExt: -otherExt,
    otherSideways: leftIsPrimary ? f.rightWristSideways : f.leftWristSideways,
  };
}

export function computeScores(
  landmarks: Landmark[],
  f: PoseFeatures,
  aspect: number,
  t: Thresholds,
): Record<Move, number> {
  const special =
    (Math.min(f.leftWristAboveNose, f.rightWristAboveNose) - t.specialWristAboveNose) / t.specialScale;

  const block = blockMargin(landmarks, f, aspect, t);

  const dodge = Math.max(
    (f.leanDeg - t.dodgeLeanDeg) / t.dodgeLeanScale,
    (Math.abs(f.shoulderHipOffset) - t.dodgeOffset) / t.dodgeOffsetScale,
  );

  const arms = armMargins(f, t);
  const otherArmAway = Math.max(
    (arms.otherSideways - t.heavyOtherArmAway) / t.heavyOtherArmScale,
    arms.otherExt,
  );
  const stanceWide =
    f.ankleSpread === null ? -1 : (f.ankleSpread - t.heavyStanceWidth) / t.heavyStanceScale;
  const heavy = Math.min(arms.primaryExt, Math.max(otherArmAway, stanceWide));

  const punch = Math.min(arms.primaryExt, arms.otherNotExt);

  return {
    SPECIAL: scoreFromMargin(special),
    BLOCK: scoreFromMargin(block),
    DODGE: scoreFromMargin(dodge),
    HEAVY_ATTACK: scoreFromMargin(heavy),
    PUNCH: scoreFromMargin(punch),
  };
}

function extensionFor(move: Move, f: PoseFeatures, t: Thresholds): number {
  switch (move) {
    case "PUNCH":
    case "HEAVY_ATTACK": {
      const elbow = Math.max(f.leftElbowDeg, f.rightElbowDeg);
      const reach = Math.max(f.leftReach, f.rightReach);
      return 0.5 * clamp01((elbow - 140) / 40) + 0.5 * clamp01((reach - 1.0) / 0.6);
    }
    case "SPECIAL":
      return clamp01(Math.min(f.leftWristAboveNose, f.rightWristAboveNose) / 0.8);
    case "BLOCK":
      return clamp01(1 - f.wristDistance / t.blockMaxWristDistance);
    case "DODGE":
      return clamp01(f.leanDeg / 45);
  }
}

export function classify(landmarks: Landmark[], opts: ClassifyOptions = {}): Classification {
  const t = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const aspect = opts.aspect ?? 1;
  const speed = clamp01(opts.speed ?? 0);
  const features = extractFeatures(landmarks, aspect, t);

  if (!features || features.visibility < t.minVisibility) {
    return {
      move: "BLOCK",
      confidence: t.fallbackConfidence,
      power: t.fallbackPower,
      metrics: { extension: 0, balance: 0, speed },
      scores: { SPECIAL: 0, BLOCK: 0, DODGE: 0, HEAVY_ATTACK: 0, PUNCH: 0 },
      features,
      fallback: true,
    };
  }

  const scores = computeScores(landmarks, features, aspect, t);
  const matched = MOVE_PRIORITY.find((m) => scores[m] >= 0.5);
  const move = matched ?? MOVE_PRIORITY.reduce((best, m) => (scores[m] > scores[best] ? m : best), "BLOCK");
  const runnerUp = Math.max(...MOVE_PRIORITY.filter((m) => m !== move).map((m) => scores[m]));
  const confidence = clamp01(scores[move] - Math.max(0, runnerUp - 0.5));

  const extension = extensionFor(move, features, t);
  const balance = clamp01(0.7 * features.hipsLevel + 0.3 * features.feetVisible);
  const power = Math.round(
    100 *
      clamp01(
        t.powerExtensionWeight * extension +
          t.powerBalanceWeight * balance +
          t.powerSpeedWeight * speed,
      ),
  );

  return {
    move,
    confidence: round2(confidence),
    power,
    metrics: { extension: round2(extension), balance: round2(balance), speed: round2(speed) },
    scores,
    features,
    fallback: false,
  };
}

/** Majority vote over recent frames; confidence/power averaged over the winning frames. */
export function smoothClassifications(history: Classification[]): Classification | null {
  const last = history[history.length - 1];
  if (!last) return null;
  const counts = new Map<Move, Classification[]>();
  for (const c of history) {
    const list = counts.get(c.move) ?? [];
    list.push(c);
    counts.set(c.move, list);
  }
  let winner: Classification[] = [];
  for (const list of counts.values()) {
    if (list.length > winner.length) winner = list;
  }
  const latest = winner[winner.length - 1] ?? last;
  return {
    ...latest,
    confidence: round2(mean(winner.map((c) => c.confidence))),
    power: Math.round(mean(winner.map((c) => c.power))),
  };
}

/** Strips debug-only fields so the result matches the shared PoseResult contract exactly. */
export function toPoseResult(c: Classification): PoseResult {
  return { move: c.move, confidence: c.confidence, power: c.power, metrics: c.metrics };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
