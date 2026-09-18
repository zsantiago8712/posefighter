import { MOVES, type Fighter, type Move } from "@posefighter/backend/convex/shared/contracts";

import { MOVE_META, MOVE_NAMES, Sub } from "./ui";

/**
 * Stick-figure examples of the five poses (mirrors the rules in features/vision/thresholds.ts).
 * Pure inline SVG: no assets, no licenses, crisp at any size.
 */
export function PoseFigure({ move, size = 64, color = "currentColor" }: { move: Move; size?: number; color?: string }) {
  const s = { stroke: color, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  // Canvas 100×120. Head ~ (50,18). Shoulders y=38, hips y=72, feet y=112.
  const body = {
    PUNCH: (
      <>
        <circle cx="50" cy="18" r="10" {...s} />
        <path d="M50 28 V72" {...s} />
        <path d="M50 40 L14 40" {...s} /> {/* extended arm */}
        <path d="M50 42 L62 62 L54 74" {...s} /> {/* guard arm */}
        <path d="M50 72 L36 112 M50 72 L66 112" {...s} />
      </>
    ),
    BLOCK: (
      <>
        <circle cx="50" cy="18" r="10" {...s} />
        <path d="M50 28 V72" {...s} />
        <path d="M50 40 L30 48 L62 50" {...s} /> {/* crossed arms */}
        <path d="M50 40 L70 48 L38 50" {...s} />
        <path d="M50 72 L38 112 M50 72 L62 112" {...s} />
      </>
    ),
    DODGE: (
      <>
        <circle cx="26" cy="24" r="10" {...s} />
        <path d="M32 33 L52 72" {...s} /> {/* leaning torso */}
        <path d="M36 42 L14 58 M38 44 L58 46" {...s} />
        <path d="M52 72 L40 112 M52 72 L70 112" {...s} />
      </>
    ),
    HEAVY_ATTACK: (
      <>
        <circle cx="50" cy="18" r="10" {...s} />
        <path d="M50 28 V70" {...s} />
        <path d="M50 40 L10 34" {...s} /> {/* long strike */}
        <path d="M50 40 L84 52" {...s} /> {/* other arm out */}
        <path d="M50 70 L22 112 M50 70 L78 112" {...s} /> {/* wide stance */}
      </>
    ),
    SPECIAL: (
      <>
        <circle cx="50" cy="26" r="10" {...s} />
        <path d="M50 36 V74" {...s} />
        <path d="M50 44 L30 20 L26 4 M50 44 L70 20 L74 4" {...s} /> {/* hands over head */}
        <path d="M50 74 L38 112 M50 74 L62 112" {...s} />
      </>
    ),
  }[move];
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-label={`${move} pose`} role="img">
      {body}
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
          <PoseFigure move={m} size={22} />
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
            <PoseFigure move={m} size={40} />
            <div className="arcade text-center text-[11px] leading-none uppercase italic">{MOVE_NAMES[fighter][m]}</div>
            <div className="text-center text-[8px] leading-tight font-bold tracking-wide opacity-75">{POSE_HINT[m]}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] tracking-widest text-white/40 uppercase">block beats punch · dodge beats heavy · heavy beats block · special beats dodge</p>
    </div>
  );
}
