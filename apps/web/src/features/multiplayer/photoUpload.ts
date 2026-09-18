import type { Id } from "@posefighter/backend/convex/_generated/dataModel";
import type { Move } from "@posefighter/backend/convex/shared/contracts";

/** POST a JPEG to a Convex upload URL. Returns null on any failure — the round must never block on a photo. */
export async function uploadPhoto(uploadUrl: string, photo: Blob): Promise<Id<"_storage"> | null> {
  try {
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": photo.type || "image/jpeg" },
      body: photo,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { storageId?: string };
    return (json.storageId as Id<"_storage">) ?? null;
  } catch {
    return null;
  }
}

/** Dev-only stand-in for a real pose photo: a colored card with the move name. */
export async function makeFakePhoto(move: Move, nickname: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 480;
  const ctx = canvas.getContext("2d")!;
  const hue = { PUNCH: 35, BLOCK: 200, DODGE: 150, HEAVY_ATTACK: 15, SPECIAL: 290 }[move];
  const g = ctx.createLinearGradient(0, 0, 0, 480);
  g.addColorStop(0, `hsl(${hue} 80% 45%)`);
  g.addColorStop(1, `hsl(${hue} 80% 15%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 360, 480);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🧍", 180, 260);
  ctx.font = "italic bold 40px sans-serif";
  ctx.fillText(move.replace("_", " "), 180, 380);
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(nickname, 180, 430);
  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8));
}
