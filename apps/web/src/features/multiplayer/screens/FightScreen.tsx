import type { CombatResult } from "@posefighter/backend/convex/shared/contracts";
import { Component, type ReactNode } from "react";

import { FightPlayer } from "@/game";

import { FightSummaryFallback } from "./FightSummaryFallback";

/**
 * The cinematic. GAME's <FightPlayer/> presents the already-resolved CombatResult and calls onComplete.
 * If Phaser throws for any reason (WebGL missing, asset failure), we fall back to the text summary so the
 * battle never gets stuck.
 */
export function FightScreen({ result, onComplete }: { result: CombatResult; onComplete: () => void }) {
  return (
    <FightErrorBoundary fallback={<FightSummaryFallback result={result} onComplete={onComplete} />}>
      <div className="h-dvh w-full overflow-hidden bg-[#0a0614]" style={{ touchAction: "none", overscrollBehavior: "none" }}>
        <FightPlayer result={result} onComplete={onComplete} />
      </div>
    </FightErrorBoundary>
  );
}

class FightErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[FightScreen] Phaser cinematic failed, using text fallback", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
