import type * as Phaser from "phaser";

/** key → file base name in /assets/audio (ogg + m4a fallback) */
export const SFX_FILES = ["punch", "heavy", "block", "dodge", "whoosh", "fireball", "explosion", "ko", "sting"] as const;
export type SfxKey = (typeof SFX_FILES)[number];

export function loadSfx(loader: Phaser.Loader.LoaderPlugin): void {
  for (const key of SFX_FILES) {
    loader.audio(`sfx-${key}`, [`/assets/audio/${key}.m4a`, `/assets/audio/${key}.ogg`]);
  }
}

/** Never throws, never blocks: silently no-ops when audio is locked or the file failed to load. */
export function playSfx(scene: Phaser.Scene, key: SfxKey | undefined, volume = 0.7, rate = 1): void {
  if (!key) return;
  try {
    const cacheKey = `sfx-${key}`;
    if (!scene.cache.audio.exists(cacheKey)) return;
    if (scene.sound.locked) {
      // still waiting for the first user gesture; ask Phaser to listen for it and skip this one
      scene.sound.unlock();
      return;
    }
    scene.sound.play(cacheKey, { volume, rate });
  } catch {
    // audio is decoration; ignore
  }
}
