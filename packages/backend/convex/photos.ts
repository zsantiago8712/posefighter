import { mutation } from "./_generated/server";

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
