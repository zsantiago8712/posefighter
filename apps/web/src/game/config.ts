export const BACKGROUND_COLOR = "#0a0614";

/** Everything position-related derives from this so portrait phones and landscape desktops share one scene. */
export interface Layout {
  width: number;
  height: number;
  groundY: number;
  p1X: number;
  p2X: number;
  /** y of the health bar row */
  barY: number;
  /** multiplier on CharacterDefinition.assets.scale */
  fighterScale: number;
  landscape: boolean;
}

export const PORTRAIT: Layout = { width: 720, height: 1280, groundY: 900, p1X: 185, p2X: 535, barY: 96, fighterScale: 1, landscape: false };
export const LANDSCAPE: Layout = { width: 1280, height: 720, groundY: 620, p1X: 340, p2X: 940, barY: 60, fighterScale: 0.9, landscape: true };

export function pickLayout(containerWidth: number, containerHeight: number): Layout {
  return containerWidth > containerHeight ? LANDSCAPE : PORTRAIT;
}

/** Read the layout back from a running scene (logical size is fixed per game instance). */
export function layoutOf(scene: { scale: { width: number; height: number } }): Layout {
  return scene.scale.width > scene.scale.height ? LANDSCAPE : PORTRAIT;
}
