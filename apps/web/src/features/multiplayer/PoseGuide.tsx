import { MOVES, type Fighter, type Move } from "@posefighter/backend/convex/shared/contracts";

import { POSE_ICON_PATHS } from "./poseIcons";
import { MOVE_META, MOVE_NAMES, Sub } from "./ui";

/**
 * Pose icons (Google Material Symbols, Apache 2.0): a person doing roughly the pose the classifier expects.
 *   SPECIAL → sports_gymnastics (arms up) · PUNCH → emoji_people (arm out) · HEAVY → sports_martial_arts
 *   DODGE → directions_run · BLOCK → shield_person
 */
export function PoseFigure({ move, size = 64, color = "currentColor" }: { move: Move; size?: number; color?: string }) {
  const icon = POSE_ICON_PATHS[move];
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} aria-label={`${move} pose`} role="img">
      <path d={icon.d} fill={color} />
    </svg>
  );
}

export const POSE_HINT: Record<Move, string> = {
  PUNCH: "one arm straight out",
  BLOCK: "arms crossed on chest",
  DODGE: "lean hard to one side",
  HEAVY_ATTACK: "wide stance + arm out",
  SPECIAL: "both hands over head",
};

/** Compact legend: figure + fighter-flavored name + hint, one row per move. */
export function PoseLegend({ fighter }: { fighter: Fighter }) {
  return (
    <div className="flex flex-col gap-1.5">
      {MOVES.map((m) => (
        <div key={m} className={`flex items-center gap-2 rounded-lg ${MOVE_META[m].color} px-2 py-1 text-black`}>
          <PoseFigure move={m} size={26} />
          <div className="leading-tight">
            <div className="arcade text-sm uppercase italic">{MOVE_NAMES[fighter][m]}</div>
            <div className="text-[9px] font-bold tracking-widest opacity-70">{POSE_HINT[m]}</div>
          </div>
          <span className="ml-auto text-base">{MOVE_META[m].emoji}</span>
        </div>
      ))}
    </div>
  );
}

/** Big guide for the lobby: five cards you can learn from while waiting for the opponent. */
export function PoseGuide({ fighter }: { fighter: Fighter }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <Sub>how to attack · strike the pose when the camera counts down</Sub>
      <div className="grid grid-cols-5 gap-2">
        {MOVES.map((m) => (
          <div key={m} className={`flex flex-col items-center gap-1 rounded-xl ${MOVE_META[m].color} px-1 py-2 text-black`}>
            <PoseFigure move={m} size={44} />
            <div className="arcade text-center text-[11px] leading-none uppercase italic">{MOVE_NAMES[fighter][m]}</div>
            <div className="text-center text-[8px] leading-tight font-bold tracking-wide opacity-75">{POSE_HINT[m]}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] tracking-widest text-white/40 uppercase">block beats punch · dodge beats heavy · heavy beats block · special beats dodge</p>
    </div>
  );
}
