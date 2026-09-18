/**
 * PUBLIC API of the GAME workstream. MULTIPLAYER imports only from here.
 *
 *   <FightPlayer result={combatResult} onComplete={() => advance()} />
 */
export { FightPlayer } from "./FightPlayer";
export type { FightPlayerProps } from "./FightPlayer";

/** Call from a tap/click handler so the fight has sound even if the player never touches the screen again. */
export { unlockAudio } from "./audio/context";
