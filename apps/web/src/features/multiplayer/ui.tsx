import type { Fighter, Move } from "@posefighter/backend/convex/shared/contracts";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Small arcade-styled primitives used only by the multiplayer screens. */

export const FIGHTER_META: Record<Fighter, { label: string; emoji: string; color: string; glow: string }> = {
  BOXER: { label: "BOXER", emoji: "🥊", color: "from-red-600 to-orange-500", glow: "shadow-red-500/50" },
  SAMURAI: { label: "SAMURAI", emoji: "⚔️", color: "from-sky-500 to-indigo-600", glow: "shadow-sky-400/50" },
  WIZARD: { label: "WIZARD", emoji: "🔮", color: "from-fuchsia-600 to-violet-700", glow: "shadow-fuchsia-500/50" },
};

export const MOVE_META: Record<Move, { label: string; emoji: string; hint: string; color: string }> = {
  PUNCH: { label: "PUNCH", emoji: "👊", hint: "Reliable hit", color: "bg-amber-500" },
  BLOCK: { label: "BLOCK", emoji: "🛡️", hint: "Stops PUNCH", color: "bg-sky-500" },
  DODGE: { label: "DODGE", emoji: "💨", hint: "Avoids HEAVY", color: "bg-emerald-500" },
  HEAVY_ATTACK: { label: "HEAVY", emoji: "💥", hint: "Breaks BLOCK", color: "bg-orange-600" },
  SPECIAL: { label: "SPECIAL", emoji: "⚡", hint: "Punishes DODGE", color: "bg-fuchsia-600" },
};

/** Fighter-flavored names for the canonical moves (presentation only). */
export const MOVE_NAMES: Record<Fighter, Record<Move, string>> = {
  BOXER: { PUNCH: "JAB", BLOCK: "GUARD UP", DODGE: "SWAY", HEAVY_ATTACK: "HAYMAKER", SPECIAL: "POWER PUNCH" },
  SAMURAI: { PUNCH: "QUICK SLASH", BLOCK: "PARRY", DODGE: "SIDESTEP", HEAVY_ATTACK: "HEAVY CLEAVE", SPECIAL: "ENERGY SLASH" },
  WIZARD: { PUNCH: "ARCANE BOLT", BLOCK: "MANA WARD", DODGE: "BLINK", HEAVY_ATTACK: "METEOR", SPECIAL: "FIREBALL" },
};

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`flex min-h-dvh w-full flex-col items-center bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#09090b_60%)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-white ${className}`}
      style={{ touchAction: "manipulation", overscrollBehavior: "none" }}
    >
      {children}
    </main>
  );
}

export function Title({ children, size = "lg" }: { children: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const cls = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl", xl: "text-6xl sm:text-7xl" }[size];
  return (
    <h1
      className={`arcade ${cls} max-w-full px-3 text-center leading-[1.05] tracking-wide break-words uppercase italic drop-shadow-[0_4px_0_rgba(0,0,0,0.8)]`}
    >
      {children}
    </h1>
  );
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm font-semibold tracking-[0.3em] text-white/60 uppercase">{children}</p>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger"; big?: boolean };

export function ArcadeButton({ tone = "primary", big = false, className = "", children, ...props }: BtnProps) {
  const tones = {
    primary: "bg-gradient-to-b from-yellow-300 to-orange-500 text-black shadow-[0_6px_0_#7c2d12] active:shadow-[0_2px_0_#7c2d12]",
    ghost: "bg-white/10 text-white border border-white/20 shadow-[0_6px_0_rgba(0,0,0,0.6)] active:shadow-[0_2px_0_rgba(0,0,0,0.6)]",
    danger: "bg-gradient-to-b from-rose-500 to-red-700 text-white shadow-[0_6px_0_#4c0519] active:shadow-[0_2px_0_#4c0519]",
  }[tone];
  return (
    <button
      type="button"
      className={`arcade w-full rounded-2xl ${big ? "min-h-20 text-3xl" : "min-h-14 text-xl"} px-6 tracking-wider uppercase italic transition-transform select-none active:translate-y-1 disabled:opacity-40 ${tones} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`arcade w-full rounded-2xl border-2 border-white/20 bg-black/40 px-4 py-4 text-center text-3xl tracking-widest text-white uppercase placeholder:text-white/30 focus:border-yellow-400 focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function HpBar({ hp, max = 100, align = "left" }: { hp: number; max?: number; align?: "left" | "right" }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const color = pct > 50 ? "bg-emerald-400" : pct > 25 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className={`h-4 w-full overflow-hidden rounded-sm border-2 border-white/70 bg-black/60 ${align === "right" ? "scale-x-[-1]" : ""}`}>
      <div className={`h-full ${color} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function FighterBadge({ fighter, nickname, hp, side }: { fighter: Fighter; nickname: string; hp?: number; side: "left" | "right" }) {
  const m = FIGHTER_META[fighter];
  return (
    <div className={`flex w-full flex-col gap-1 ${side === "right" ? "items-end text-right" : "items-start"}`}>
      <div className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-xl shadow-lg ${m.glow}`}>{m.emoji}</span>
        <div>
          <div className="arcade text-xl leading-none uppercase italic">{nickname}</div>
          <div className="text-[10px] font-bold tracking-[0.25em] text-white/60">{m.label}</div>
        </div>
      </div>
      {hp !== undefined && <HpBar hp={hp} align={side} />}
    </div>
  );
}
