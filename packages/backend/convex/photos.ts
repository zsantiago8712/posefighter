import { v } from "convex/values";

import { internalMutation, mutation } from "./_generated/server";

/**
 * Client flow:
 *   const url = await generateUploadUrl();
 *   const res = await fetch(url, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
 *   const { storageId } = await res.json();
 *   submitMove({ ..., photoStorageId: storageId })
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * PRIVACY: pose photos exist only for the duration of a battle. This deletes every photo of a room from
 * storage and strips the URLs from stored round results. Scheduled 5 min after a KO and run immediately
 * on rematch.
 */
export const purgeRoomPhotos = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_room_round", (q) => q.eq("roomId", roomId))
      .collect();
    for (const s of subs) {
      if (s.photoStorageId) {
        await ctx.storage.delete(s.photoStorageId).catch(() => {});
        await ctx.db.patch(s._id, { photoStorageId: undefined });
      }
    }
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room_round", (q) => q.eq("roomId", roomId))
      .collect();
    for (const r of rounds) {
      const result = r.result as { player1?: { posePhotoUrl?: string }; player2?: { posePhotoUrl?: string } };
      if (result?.player1?.posePhotoUrl || result?.player2?.posePhotoUrl) {
        const { posePhotoUrl: _a, ...p1 } = result.player1 ?? {};
        const { posePhotoUrl: _b, ...p2 } = result.player2 ?? {};
        void _a;
        void _b;
        await ctx.db.patch(r._id, { result: { ...result, player1: p1, player2: p2 } });
      }
    }
  },
});
