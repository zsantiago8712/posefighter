export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** Skeleton edge between two landmark indices (same shape as MediaPipe's unexported Connection). */
export interface Connection {
  start: number;
  end: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export const LM = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
} as const;

export const LANDMARK_COUNT = 33;

/** Landmarks the rules depend on; their mean visibility decides the "no person" fallback. */
export const KEY_LANDMARKS = [
  LM.NOSE,
  LM.L_SHOULDER,
  LM.R_SHOULDER,
  LM.L_ELBOW,
  LM.R_ELBOW,
  LM.L_WRIST,
  LM.R_WRIST,
  LM.L_HIP,
  LM.R_HIP,
];

/**
 * Converts a normalized landmark (x/y in 0..1 of the frame) into an isotropic space where
 * one unit vertically equals one unit horizontally. `aspect` is frameWidth / frameHeight.
 * MediaPipe's z shares x's scale, so it is stretched the same way and then weighted.
 */
export function toPoint(lm: Landmark, aspect: number, depthWeight: number): Point3 {
  return { x: lm.x * aspect, y: lm.y, z: (lm.z ?? 0) * aspect * depthWeight };
}

export function dist(a: Point3, b: Point3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function dist2d(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point3, b: Point3): Point3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/** Angle at vertex `b` formed by a-b-c, in degrees (0..180). */
export function angleDeg(a: Point3, b: Point3, c: Point3): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const n1 = Math.hypot(v1.x, v1.y, v1.z);
  const n2 = Math.hypot(v2.x, v2.y, v2.z);
  if (n1 === 0 || n2 === 0) return 0;
  const cos = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (n1 * n2);
  return (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;
}

/** Tilt of the segment from `bottom` to `top` relative to vertical, in degrees (0 = upright). */
export function leanDeg(top: Point3, bottom: Point3): number {
  const dx = top.x - bottom.x;
  const dy = bottom.y - top.y;
  if (dx === 0 && dy === 0) return 0;
  return Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
}

/** Angle of the vector from→to measured from straight down: 0 = hanging, 90 = sideways/forward, 180 = up. */
export function angleFromDownDeg(from: Point3, to: Point3): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const lateral = Math.hypot(dx, dz);
  if (lateral === 0 && dy === 0) return 0;
  return (Math.atan2(lateral, dy) * 180) / Math.PI;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
