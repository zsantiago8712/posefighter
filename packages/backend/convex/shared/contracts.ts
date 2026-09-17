/**
 * POSE FIGHT — SHARED CONTRACTS
 *
 * This is the ONLY file shared by all three workstreams (VISION, GAME, MULTIPLAYER).
 *
 * Rules:
 *  - Types and constants ONLY. No logic, no imports, no side effects.
 *  - Owned by the tech lead. Do NOT edit without posting the proposed change in
 *    docs/HACKATHON.md → "Contract change requests" and getting a 👍 from the
 *    other two workstreams.
 *  - Additive changes (new optional fields) are cheap. Renames/removals are not.
 *
 * Import paths:
 *  - From Convex functions (packages/backend/convex/**):
 *      import type { CombatResult } from "./shared/contracts";
 *  - From the web app (apps/web/src/**):
 *      import type { PoseResult } from "@posefighter/backend/convex/shared/contracts";
 *
 * Full documentation: /AGENTS.md → "Shared contracts".
 */

// ---------------------------------------------------------------------------
// Fighters & moves
// ---------------------------------------------------------------------------

export const FIGHTERS = ["BOXER", "SAMURAI", "WIZARD"] as const;
export type Fighter = (typeof FIGHTERS)[number];

export const MOVES = ["PUNCH", "BLOCK", "DODGE", "HEAVY_ATTACK", "SPECIAL"] as const;
export type Move = (typeof MOVES)[number];

// ---------------------------------------------------------------------------
// VISION → MULTIPLAYER
// ---------------------------------------------------------------------------

/** Output of the vision system for one captured pose. Produced entirely on-device. */
export interface PoseResult {
  move: Move;
  /** 0..1 — how sure the classifier is. Below ~0.5 the UI should ask to retry. */
  confidence: number;
  /** 0..100 — pose quality. Slightly modifies damage. Never overrides strategy. */
  power: number;
  metrics?: {
    extension?: number;
    balance?: number;
    speed?: number;
  };
}

/** What the capture screen hands to the multiplayer layer after the countdown. */
export interface CaptureOutput {
  pose: PoseResult;
  /** JPEG snapshot of the player performing the pose. MULTIPLAYER uploads it to Convex storage. */
  photo: Blob;
}

// ---------------------------------------------------------------------------
// MULTIPLAYER → GAME
// ---------------------------------------------------------------------------

export interface CombatPlayerResult {
  playerId: string;
  nickname: string;
  fighter: Fighter;
  move: Move;
  power: number;
  damageReceived: number;
  hpBefore: number;
  hpAfter: number;
  posePhotoUrl?: string;
}

/**
 * Outcome is described from a neutral point of view.
 *  P1_HIT     player1 took damage, player2 did not
 *  P2_HIT     player2 took damage, player1 did not
 *  DOUBLE_HIT both attacked with different moves and both took damage
 *  CLASH      both chose the same attack; both take reduced damage
 *  BLOCKED    an attack was blocked (defender took chip damage or none)
 *  DODGED     an attack was fully or partially dodged
 *  STALEMATE  both chose defensive moves; nothing happened
 *  KO         somebody reached 0 HP this round (overrides everything else)
 */
export const COMBAT_OUTCOMES = [
  "P1_HIT",
  "P2_HIT",
  "BLOCKED",
  "DODGED",
  "CLASH",
  "DOUBLE_HIT",
  "STALEMATE",
  "KO",
] as const;
export type CombatOutcome = (typeof COMBAT_OUTCOMES)[number];

/** The authoritative, already-resolved result of one round. GAME only PRESENTS this. */
export interface CombatResult {
  roundNumber: number;
  player1: CombatPlayerResult;
  player2: CombatPlayerResult;
  outcome: CombatOutcome;
  /** Set when hpAfter of someone is 0. Presentation uses it for the KO/victory screen. */
  winnerPlayerId?: string;
  /**
   * Optional hint list for the presentation layer, e.g. ["p1_attack","p2_block","impact"].
   * GAME may ignore it and derive choreography from moves + outcome instead.
   */
  animationSequence?: string[];
}

// ---------------------------------------------------------------------------
// Game constants everyone must agree on
// ---------------------------------------------------------------------------

export const MAX_HP = 100;
export const COUNTDOWN_SECONDS = 3;
export const ROOM_CODE_LENGTH = 4;
