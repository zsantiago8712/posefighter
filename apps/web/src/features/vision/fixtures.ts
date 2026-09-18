import type { Move } from "@posefighter/backend/convex/shared/contracts";

import { type Classification, classify } from "./classify";
import { LANDMARK_COUNT, LM, type Landmark } from "./geometry";
import { getThresholds } from "./thresholds";

/** Fixtures are authored in a square frame, so classify them with aspect 1. */
export const FIXTURE_ASPECT = 1;

type Overrides = Partial<Record<number, [number, number]>>;

/** Neutral person standing centred, facing the camera, arms hanging. Normalized square coords. */
function body(overrides: Overrides = {}, visibility = 0.95): Landmark[] {
  const base: Record<number, [number, number]> = {
    0: [0.5, 0.2],
    1: [0.52, 0.18],
    2: [0.53, 0.18],
    3: [0.54, 0.18],
    4: [0.48, 0.18],
    5: [0.47, 0.18],
    6: [0.46, 0.18],
    7: [0.57, 0.2],
    8: [0.43, 0.2],
    9: [0.52, 0.24],
    10: [0.48, 0.24],
    [LM.L_SHOULDER]: [0.62, 0.32],
    [LM.R_SHOULDER]: [0.38, 0.32],
    [LM.L_ELBOW]: [0.66, 0.46],
    [LM.R_ELBOW]: [0.34, 0.46],
    [LM.L_WRIST]: [0.66, 0.6],
    [LM.R_WRIST]: [0.34, 0.6],
    17: [0.67, 0.63],
    18: [0.33, 0.63],
    19: [0.67, 0.63],
    20: [0.33, 0.63],
    21: [0.66, 0.62],
    22: [0.34, 0.62],
    [LM.L_HIP]: [0.58, 0.6],
    [LM.R_HIP]: [0.42, 0.6],
    [LM.L_KNEE]: [0.58, 0.78],
    [LM.R_KNEE]: [0.42, 0.78],
    [LM.L_ANKLE]: [0.58, 0.95],
    [LM.R_ANKLE]: [0.42, 0.95],
    29: [0.58, 0.97],
    30: [0.42, 0.97],
    31: [0.6, 0.98],
    32: [0.4, 0.98],
  };
  const out: Landmark[] = [];
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const [x, y] = overrides[i] ?? base[i] ?? [0.5, 0.5];
    out.push({ x, y, z: 0, visibility });
  }
  return out;
}

export const FIXTURES: Record<Move, Landmark[]> = {
  SPECIAL: body({
    [LM.L_ELBOW]: [0.68, 0.18],
    [LM.R_ELBOW]: [0.32, 0.18],
    [LM.L_WRIST]: [0.68, 0.05],
    [LM.R_WRIST]: [0.32, 0.05],
  }),
  BLOCK: body({
    [LM.L_ELBOW]: [0.68, 0.48],
    [LM.R_ELBOW]: [0.32, 0.48],
    [LM.L_WRIST]: [0.53, 0.4],
    [LM.R_WRIST]: [0.47, 0.4],
  }),
  DODGE: body({
    0: [0.7, 0.22],
    [LM.L_SHOULDER]: [0.8, 0.34],
    [LM.R_SHOULDER]: [0.56, 0.34],
    [LM.L_ELBOW]: [0.84, 0.48],
    [LM.R_ELBOW]: [0.52, 0.48],
    [LM.L_WRIST]: [0.86, 0.62],
    [LM.R_WRIST]: [0.5, 0.62],
  }),
  HEAVY_ATTACK: body({
    [LM.L_ELBOW]: [0.78, 0.32],
    [LM.R_ELBOW]: [0.22, 0.32],
    [LM.L_WRIST]: [0.95, 0.32],
    [LM.R_WRIST]: [0.05, 0.32],
    [LM.L_KNEE]: [0.68, 0.78],
    [LM.R_KNEE]: [0.32, 0.78],
    [LM.L_ANKLE]: [0.72, 0.95],
    [LM.R_ANKLE]: [0.28, 0.95],
  }),
  PUNCH: body({
    [LM.L_ELBOW]: [0.78, 0.32],
    [LM.L_WRIST]: [0.95, 0.32],
  }),
};

export const NEUTRAL_FIXTURE = body();
export const NO_PERSON_FIXTURE = body({}, 0.1);

export interface FixtureCheck {
  name: string;
  expected: Move | "fallback" | "unmatched";
  result: Classification;
  pass: boolean;
}

/** Classifies every fixture with the current runtime thresholds. Used by /debug/vision. */
export function runFixtureChecks(): FixtureCheck[] {
  const thresholds = getThresholds();
  const opts = { aspect: FIXTURE_ASPECT, thresholds };
  const checks: FixtureCheck[] = (Object.keys(FIXTURES) as Move[]).map((move) => {
    const result = classify(FIXTURES[move], opts);
    return { name: move, expected: move, result, pass: result.move === move && result.confidence >= 0.5 };
  });
  const neutral = classify(NEUTRAL_FIXTURE, opts);
  checks.push({ name: "NEUTRAL", expected: "unmatched", result: neutral, pass: neutral.confidence < 0.5 });
  const nobody = classify(NO_PERSON_FIXTURE, opts);
  checks.push({ name: "NO_PERSON", expected: "fallback", result: nobody, pass: nobody.fallback });
  return checks;
}
