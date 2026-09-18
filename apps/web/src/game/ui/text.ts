import type * as Phaser from "phaser";

export const FONT_FAMILY = '"Bangers", Impact, "Arial Black", "Helvetica Neue", sans-serif';

export function arcadeText(size: number, color = "#ffffff", strokeThickness = Math.max(4, size * 0.14)): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: "bold",
    color,
    stroke: "#000000",
    strokeThickness,
    align: "center",
    shadow: { offsetX: 0, offsetY: Math.max(3, size * 0.06), color: "#000000", blur: 0, fill: true, stroke: true },
  };
}
