import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const fighterValidator = v.union(v.literal("BOXER"), v.literal("SAMURAI"), v.literal("WIZARD"));

export const moveValidator = v.union(
  v.literal("PUNCH"),
  v.literal("BLOCK"),
  v.literal("DODGE"),
  v.literal("HEAVY_ATTACK"),
  v.literal("SPECIAL"),
);

export const roomStatusValidator = v.union(
  v.literal("LOBBY"),
  v.literal("IN_ROUND"),
  v.literal("REVEAL"),
  v.literal("FINISHED"),
);

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    status: roomStatusValidator,
    roundNumber: v.number(),
    hostToken: v.string(),
    winnerPlayerId: v.optional(v.id("players")),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    token: v.string(),
    seat: v.number(), // 1 | 2
    nickname: v.string(),
    fighter: fighterValidator,
    hp: v.number(),
    ready: v.boolean(),
    lastSeenAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_token", ["token"]),

  submissions: defineTable({
    roomId: v.id("rooms"),
    roundNumber: v.number(),
    playerId: v.id("players"),
    move: moveValidator,
    power: v.number(),
    confidence: v.number(),
    photoStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_room_round", ["roomId", "roundNumber"])
    .index("by_room_round_player", ["roomId", "roundNumber", "playerId"]),

  rounds: defineTable({
    roomId: v.id("rooms"),
    roundNumber: v.number(),
    result: v.any(), // CombatResult (see shared/contracts.ts)
    readyPlayerIds: v.array(v.id("players")),
    resolvedAt: v.number(),
  }).index("by_room_round", ["roomId", "roundNumber"]),
});
