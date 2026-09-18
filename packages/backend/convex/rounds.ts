import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { resolveRound, type ResolveInputPlayer } from "./combat/resolve";
import { findPlayerByToken, getRoomByCode, getRoomPlayers } from "./rooms";
import { moveValidator } from "./schema";
import type { CombatResult } from "./shared/contracts";

/** Host may force the next round after this many ms of waiting on the other player. */
export const FORCE_NEXT_ROUND_AFTER_MS = 20_000;

/**
 * Submit my move for the current round. Idempotent per (room, round, player).
 * When this is the SECOND submission of the round, the round is resolved right here,
 * inside the same transaction — exactly once, no scheduler.
 */
export const submitMove = mutation({
  args: {
    code: v.string(),
    token: v.string(),
    roundNumber: v.number(),
    move: moveValidator,
    power: v.number(),
    confidence: v.number(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "IN_ROUND") return { locked: false, resolved: false, reason: "NOT_IN_ROUND" as const };
    if (room.roundNumber !== args.roundNumber) {
      return { locked: false, resolved: false, reason: "STALE_ROUND" as const };
    }

    const players = await getRoomPlayers(ctx, room._id);
    const me = findPlayerByToken(players, args.token);
    if (!me) throw new Error("NOT_IN_ROOM");

    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_room_round_player", (q) =>
        q.eq("roomId", room._id).eq("roundNumber", room.roundNumber).eq("playerId", me._id),
      )
      .unique();
    if (existing) return { locked: true, resolved: false, reason: "ALREADY_LOCKED" as const };

    await ctx.db.insert("submissions", {
      roomId: room._id,
      roundNumber: room.roundNumber,
      playerId: me._id,
      move: args.move,
      power: clamp(args.power, 0, 100),
      confidence: clamp(args.confidence, 0, 1),
      photoStorageId: args.photoStorageId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(me._id, { lastSeenAt: Date.now() });

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id).eq("roundNumber", room.roundNumber))
      .collect();

    if (submissions.length < 2) return { locked: true, resolved: false, reason: null };

    // ---- both moves are in: resolve ONCE ----
    const p1 = players.find((p) => p.seat === 1);
    const p2 = players.find((p) => p.seat === 2);
    if (!p1 || !p2) throw new Error("ROOM_INCOMPLETE");
    const s1 = submissions.find((s) => s.playerId === p1._id);
    const s2 = submissions.find((s) => s.playerId === p2._id);
    if (!s1 || !s2) throw new Error("SUBMISSIONS_INCONSISTENT");

    const result = resolveRound({
      roundNumber: room.roundNumber,
      p1: await toResolveInput(ctx, p1, s1),
      p2: await toResolveInput(ctx, p2, s2),
    });

    await ctx.db.patch(p1._id, { hp: result.player1.hpAfter });
    await ctx.db.patch(p2._id, { hp: result.player2.hpAfter });

    await ctx.db.insert("rounds", {
      roomId: room._id,
      roundNumber: room.roundNumber,
      result,
      readyPlayerIds: [],
      resolvedAt: Date.now(),
    });

    if (result.outcome === "KO" && result.winnerPlayerId) {
      const winner = players.find((p) => p._id === result.winnerPlayerId);
      await ctx.db.patch(room._id, { status: "FINISHED", winnerPlayerId: winner?._id });
    } else {
      await ctx.db.patch(room._id, { status: "REVEAL" });
    }

    return { locked: true, resolved: true, reason: null };
  },
});

async function toResolveInput(
  ctx: MutationCtx,
  player: Doc<"players">,
  sub: Doc<"submissions">,
): Promise<ResolveInputPlayer> {
  const posePhotoUrl = sub.photoStorageId ? await ctx.storage.getUrl(sub.photoStorageId) : null;
  return {
    playerId: player._id,
    nickname: player.nickname,
    fighter: player.fighter,
    move: sub.move,
    power: sub.power,
    hp: player.hp,
    ...(posePhotoUrl ? { posePhotoUrl } : {}),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

/** The resolved CombatResult for a round. Only exists after both moves were in. */
export const getRoundResult = query({
  args: { code: v.string(), roundNumber: v.number() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) return null;
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id).eq("roundNumber", args.roundNumber))
      .unique();
    if (!round) return null;
    return {
      result: round.result as CombatResult,
      readyPlayerIds: round.readyPlayerIds,
      resolvedAt: round.resolvedAt,
    };
  },
});

/** All resolved rounds of a battle (for recap / result screen). */
export const listRounds = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) return [];
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id))
      .collect();
    return rounds.sort((a, b) => a.roundNumber - b.roundNumber).map((r) => r.result as CombatResult);
  },
});

/**
 * I finished watching the animation. When both players are ready (and the room is still in REVEAL
 * for this round), advance to the next round. Idempotent.
 */
export const readyForNextRound = mutation({
  args: { code: v.string(), token: v.string(), roundNumber: v.number() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "REVEAL" || room.roundNumber !== args.roundNumber) return { advanced: false };

    const players = await getRoomPlayers(ctx, room._id);
    const me = findPlayerByToken(players, args.token);
    if (!me) throw new Error("NOT_IN_ROOM");

    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id).eq("roundNumber", room.roundNumber))
      .unique();
    if (!round) return { advanced: false };

    const ready = round.readyPlayerIds.includes(me._id) ? round.readyPlayerIds : [...round.readyPlayerIds, me._id];
    await ctx.db.patch(round._id, { readyPlayerIds: ready });
    await ctx.db.patch(me._id, { lastSeenAt: Date.now() });

    if (ready.length >= players.length) {
      await ctx.db.patch(room._id, { status: "IN_ROUND", roundNumber: room.roundNumber + 1 });
      return { advanced: true };
    }
    return { advanced: false };
  },
});

/** Host fallback: if the other phone stalls, advance anyway after FORCE_NEXT_ROUND_AFTER_MS. */
export const forceNextRound = mutation({
  args: { code: v.string(), token: v.string(), roundNumber: v.number() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostToken !== args.token) throw new Error("ONLY_HOST");
    if (room.status !== "REVEAL" || room.roundNumber !== args.roundNumber) return { advanced: false };

    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id).eq("roundNumber", room.roundNumber))
      .unique();
    if (!round || Date.now() - round.resolvedAt < FORCE_NEXT_ROUND_AFTER_MS) return { advanced: false };

    await ctx.db.patch(room._id, { status: "IN_ROUND", roundNumber: room.roundNumber + 1 });
    return { advanced: true };
  },
});
