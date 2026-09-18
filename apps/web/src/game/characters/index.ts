import type { Fighter } from "@posefighter/backend/convex/shared/contracts";
import { BOXER } from "./boxer";
import { SAMURAI } from "./samurai";
import type { CharacterDefinition } from "./types";
import { WIZARD } from "./wizard";

const CHARACTERS: Record<Fighter, CharacterDefinition> = {
  BOXER,
  SAMURAI,
  WIZARD,
};

export function getCharacter(fighter: Fighter): CharacterDefinition {
  return CHARACTERS[fighter];
}

export type { AnimationDefinition, AnimationName, CharacterDefinition } from "./types";
