import { useSyncExternalStore } from "react";

/**
 * Every tunable number of the vision system. Distances are in shoulder widths (sw),
 * angles in degrees, times in ms. `*Scale` values say how far past a threshold counts
 * as a full-confidence match.
 */
export const DEFAULT_THRESHOLDS = {
  // Detection quality
  minVisibility: 0.5,
  depthWeight: 0.6,

  // SPECIAL — both wrists above the nose
  specialWristAboveNose: 0.0,
  specialScale: 0.4,

  // BLOCK — guard in front of the chest
  blockHorizontalTolerance: 0.3,
  blockVerticalTolerance: 0.6,
  blockMaxWristDistance: 0.8,
  blockScale: 0.3,

  // DODGE — torso leaning sideways
  dodgeLeanDeg: 20,
  dodgeLeanScale: 12,
  dodgeOffset: 0.5,
  dodgeOffsetScale: 0.3,

  // Arm extension (shared by PUNCH and HEAVY_ATTACK)
  extendedElbowDeg: 150,
  elbowScale: 20,
  extendedReach: 1.2,
  reachScale: 0.3,
  attackArmAngleDeg: 40,
  attackArmAngleScale: 20,

  // HEAVY_ATTACK — extended arm + other arm away from torso or wide stance
  heavyOtherArmAway: 1.0,
  heavyOtherArmScale: 0.4,
  heavyStanceWidth: 1.4,
  heavyStanceScale: 0.5,

  // Smoothing & capture timing
  smoothingFrames: 5,
  poseHoldMs: 500,
  lockedDisplayMs: 900,

  // Power
  powerExtensionWeight: 0.5,
  powerBalanceWeight: 0.3,
  powerSpeedWeight: 0.2,
  speedReference: 1.5,
  speedWindowMs: 300,

  // Fallback when nobody is visible
  fallbackConfidence: 0.2,
  fallbackPower: 30,
};

export type Thresholds = typeof DEFAULT_THRESHOLDS;
export type ThresholdKey = keyof Thresholds;

let runtime: Thresholds = { ...DEFAULT_THRESHOLDS };
const listeners = new Set<() => void>();

export function getThresholds(): Thresholds {
  return runtime;
}

export function setThresholds(patch: Partial<Thresholds>): void {
  runtime = { ...runtime, ...patch };
  listeners.forEach((l) => l());
}

export function resetThresholds(): void {
  runtime = { ...DEFAULT_THRESHOLDS };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThresholds(): Thresholds {
  return useSyncExternalStore(subscribe, getThresholds, () => DEFAULT_THRESHOLDS);
}
