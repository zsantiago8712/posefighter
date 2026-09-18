import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { generateRoomCode, normalizeRoomCode } from "./lib/roomCode";
import { fighterValidator } from "./schema";
import { MAX_HP } from "./shared/contracts";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export async function getRoomByCode(ctx: QueryCtx | MutationCtx, rawCode: string): Promise<Doc<"rooms"> | null> {
  const code = normalizeRoomCode(rawCode);
  return await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
}

export async function getRoomPlayers(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">): Promise<Doc<"players">[]> {
  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  return players.sort((a, b) => a.seat - b.seat);
}

export function findPlayerByToken(players: Doc<"players">[], token: string): Doc<"players"> | undefined {
  return players.find((p) => p.token === token);
}

/** Public shape of a player — never includes the token. */
function publicPlayer(p: Doc<"players">) {
  return {
    playerId: p._id,
    seat: p.seat,
    nickname: p.nickname,
    fighter: p.fighter,
    hp: p.hp,
    ready: p.ready,
  };
}

// ---------------------------------------------------------------------------
// mutations
// ---------------------------------------------------------------------------

export const createRoom = mutation({
  args: {
    token: v.string(),
    nickname: v.optional(v.string()),
    fighter: v.optional(fighterValidator),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await createRoomImpl(ctx, args);
  },
});

async function createRoomImpl(
  ctx: MutationCtx,
  args: { token: string; nickname?: string; fighter?: Doc<"players">["fighter"]; isPublic?: boolean },
): Promise<{ code: string }> {
  {
    let code = generateRoomCode();
    for (let i = 0; i < 10; i++) {
      const existing = await getRoomByCode(ctx, code);
      if (!existing) break;
      code = generateRoomCode();
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      status: "LOBBY",
      roundNumber: 0,
      hostToken: args.token,
      createdAt: now,
      isPublic: args.isPublic ?? false,
    });

    await ctx.db.insert("players", {
      roomId,
      token: args.token,
      seat: 1,
      nickname: args.nickname?.trim() || "PLAYER 1",
      fighter: args.fighter ?? "BOXER",
      hp: MAX_HP,
      ready: false,
      lastSeenAt: now,
    });

    return { code };
  }
}

/** A public lobby counts as "alive" if its host pinged within this window (LobbyScreen heartbeats every 10 s). */
const QUEUE_ALIVE_MS = 40_000;

/**
 * QUICK MATCH. Join the oldest alive public lobby that has exactly one (other) player; if none, open a new
 * public lobby and wait there. Convex mutations are serialized, so two players hitting this at once can't
 * both be seated into the same single slot.
 */
export const quickMatch = mutation({
  args: {
    token: v.string(),
    nickname: v.optional(v.string()),
    fighter: v.optional(fighterValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const candidates = await ctx.db
      .query("rooms")
      .withIndex("by_public_status", (q) => q.eq("isPublic", true).eq("status", "LOBBY"))
      .order("asc")
      .take(25);

    for (const room of candidates) {
      if (room.hostToken === args.token) return { code: room.code, matched: false }; // already queued
      const players = await getRoomPlayers(ctx, room._id);
      if (players.length !== 1) continue;
      const host = players[0]!;
      if (now - host.lastSeenAt > QUEUE_ALIVE_MS) continue; // abandoned lobby
      await ctx.db.insert("players", {
        roomId: room._id,
        token: args.token,
        seat: 2,
        nickname: args.nickname?.trim() || "PLAYER 2",
        fighter: args.fighter ?? "SAMURAI",
        hp: MAX_HP,
        ready: false,
        lastSeenAt: now,
      });
      return { code: room.code, matched: true };
    }

    const { code } = await createRoomImpl(ctx, { ...args, isPublic: true });
    return { code, matched: false };
  },
});

/** Presence ping so Quick Match never pairs someone into a lobby whose host left. */
export const heartbeat = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) return;
    const players = await getRoomPlayers(ctx, room._id);
    const me = findPlayerByToken(players, args.token);
    if (me) await ctx.db.patch(me._id, { lastSeenAt: Date.now() });
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    token: v.string(),
    nickname: v.optional(v.string()),
    fighter: v.optional(fighterValidator),
  },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const players = await getRoomPlayers(ctx, room._id);
    const existing = findPlayerByToken(players, args.token);
    if (existing) {
      // Reconnect: same token already has a seat.
      return { code: room.code, seat: existing.seat, reconnected: true };
    }

    if (room.status !== "LOBBY") throw new Error("BATTLE_ALREADY_STARTED");
    if (players.length >= 2) throw new Error("ROOM_FULL");

    const seat = players.some((p) => p.seat === 1) ? 2 : 1;
    await ctx.db.insert("players", {
      roomId: room._id,
      token: args.token,
      seat,
      nickname: args.nickname?.trim() || `PLAYER ${seat}`,
      fighter: args.fighter ?? "SAMURAI",
      hp: MAX_HP,
      ready: false,
      lastSeenAt: Date.now(),
    });

    return { code: room.code, seat, reconnected: false };
  },
});

export const setProfile = mutation({
  args: {
    code: v.string(),
    token: v.string(),
    nickname: v.optional(v.string()),
    fighter: v.optional(fighterValidator),
    ready: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    const players = await getRoomPlayers(ctx, room._id);
    const me = findPlayerByToken(players, args.token);
    if (!me) throw new Error("NOT_IN_ROOM");

    const patch: Partial<Doc<"players">> = { lastSeenAt: Date.now() };
    if (args.nickname !== undefined) patch.nickname = args.nickname.trim().slice(0, 12) || me.nickname;
    if (args.fighter !== undefined) patch.fighter = args.fighter;
    if (args.ready !== undefined) patch.ready = args.ready;
    await ctx.db.patch(me._id, patch);
  },
});

export const startBattle = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "LOBBY") return; // idempotent
    if (room.hostToken !== args.token) throw new Error("ONLY_HOST_CAN_START");

    const players = await getRoomPlayers(ctx, room._id);
    if (players.length !== 2) throw new Error("NEED_TWO_PLAYERS");

    for (const p of players) {
      await ctx.db.patch(p._id, { hp: MAX_HP, ready: false });
    }
    await ctx.db.patch(room._id, { status: "IN_ROUND", roundNumber: 1, winnerPlayerId: undefined });
  },
});

/** Rematch: same room, same players, fresh HP. Either player may trigger once FINISHED. */
export const rematch = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "FINISHED") return;
    const players = await getRoomPlayers(ctx, room._id);
    if (!findPlayerByToken(players, args.token)) throw new Error("NOT_IN_ROOM");

    // Clean previous rounds & submissions so round numbers restart cleanly.
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id))
      .collect();
    for (const r of rounds) await ctx.db.delete(r._id);
    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_room_round", (q) => q.eq("roomId", room._id))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);

    for (const p of players) await ctx.db.patch(p._id, { hp: MAX_HP, ready: false });
    await ctx.db.patch(room._id, { status: "IN_ROUND", roundNumber: 1, winnerPlayerId: undefined });
  },
});

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------

/**
 * The single reactive view each client subscribes to.
 * NEVER returns the opponent's move, power, or photo — only `hasSubmitted`.
 */
export const getRoomView = query({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code);
    if (!room) return null;

    const players = await getRoomPlayers(ctx, room._id);
    const me = findPlayerByToken(players, args.token);
    const opponent = me ? players.find((p) => p._id !== me._id) : undefined;

    const submissions =
      room.status === "IN_ROUND"
        ? await ctx.db
            .query("submissions")
            .withIndex("by_room_round", (q) => q.eq("roomId", room._id).eq("roundNumber", room.roundNumber))
            .collect()
        : [];

    const mySubmission = me ? submissions.find((s) => s.playerId === me._id) : undefined;
    const opponentSubmitted = opponent ? submissions.some((s) => s.playerId === opponent._id) : false;

    return {
      code: room.code,
      status: room.status,
      roundNumber: room.roundNumber,
      isPublic: room.isPublic ?? false,
      isHost: me ? room.hostToken === args.token : false,
      winnerPlayerId: room.winnerPlayerId ?? null,
      players: players.map(publicPlayer),
      me: me
        ? {
            ...publicPlayer(me),
            hasSubmitted: !!mySubmission,
            myMove: mySubmission?.move ?? null,
            myPower: mySubmission?.power ?? null,
          }
        : null,
      opponent: opponent ? { ...publicPlayer(opponent), hasSubmitted: opponentSubmitted } : null,
    };
  },
});
