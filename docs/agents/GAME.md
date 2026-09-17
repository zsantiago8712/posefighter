# WORKSTREAM 2 — GAME + PHASER + ART + VFX + AUDIO

Read `/AGENTS.md` first. This doc only adds detail for the GAME agent.

## MISSION

Turn a `CombatResult` into an absurdly satisfying, ~6–10 second cinematic 2D fight on a phone screen.
You own the WOW factor. This is **not** a physics fighting game; it is a **cinematic visualization of an
already-resolved turn**. Nothing you render changes the outcome.

> **START HERE, BEFORE ANY RENDERER CODE:** spend the first 15–20 minutes validating that you actually
> have usable, licensed fighter spritesheets (idle/attack/hit/KO) and VFX for all three archetypes.
> Fill the table in `docs/ASSETS.md` as you go. A renderer with no art is worthless; placeholder rectangles
> with great VFX + shake + flashes is a demo. Decide early which one you're building.

## CONTEXT

- App: `apps/web` (TanStack Start SSR, React 19, Vite 8, Tailwind 4). Phaser must be **client-only**:
  route `ssr: false`, `const Phaser = await import("phaser")` inside `useEffect`.
- You need **no Convex and no MediaPipe**. You need a `apps/web/.env` with the team's `VITE_CONVEX_URL`
  only so the app boots.
- Develop at `http://localhost:3001/debug/fight` with a fixture picker. Test on a phone via tunnel or
  Vercel preview.
- Library: `phaser` (3.x). Tech lead installs it on `main` right after handoff; if missing:
  `cd apps/web && bun add phaser` and commit `package.json` + `bun.lock` alone.
- Static assets go in `apps/web/public/assets/**` and are served from `/assets/...`.

## OWNED DIRECTORIES

```
apps/web/src/game/**
apps/web/src/routes/debug/fight.tsx
apps/web/public/assets/**            fighters/{boxer,samurai,wizard}/  vfx/  audio/  arenas/
docs/ASSETS.md                       you fill the license/inventory table
```

Suggested layout:

```
apps/web/src/game/
  index.ts                     ← PUBLIC API: export { FightPlayer } (+ props type). Nothing else is imported by others
  FightPlayer.tsx              ← React wrapper: creates/destroys Phaser.Game, passes CombatResult, calls onComplete
  config.ts                    ← Phaser.Game config (Scale.FIT, portrait 720×1280 logical, transparent bg?)
  scenes/BootScene.ts          ← preloads assets for both fighters in the result (+ vfx + audio)
  scenes/FightScene.ts         ← generic choreography driven by CombatResult + CharacterDefinitions
  choreography/                ← outcome → timeline steps (pure data/functions, no Phaser types if possible)
    buildSequence.ts
    steps.ts
  characters/
    types.ts                   ← CharacterDefinition, AnimationDefinition
    boxer.ts  samurai.ts  wizard.ts
    index.ts                   ← getCharacter(fighter: Fighter)
  vfx/                         ← hitSpark, projectile, flash, shake, hitStop helpers
  ui/                          ← HealthBar, DamageNumber, RoundBanner ("FIGHT!", "KO!")
  audio/                       ← sfx map + safe play (no-op if locked)
  fixtures/                    ← CombatResult fixtures (see below), fixture picker list
```

## FILES IT MAY MODIFY

Only the paths above. Import shared types:
`import type { CombatResult, Fighter, Move } from "@posefighter/backend/convex/shared/contracts";`

## FILES IT MUST NOT MODIFY

- `packages/backend/**` (including `shared/contracts.ts`) — use AGENTS.md §6.4
- `apps/web/src/features/**`, `apps/web/src/routes/room/**`, `routes/index.tsx`, `routes/__root.tsx`
- `packages/ui/**`, `apps/web/src/index.css`, `vite.config.ts`, `turbo.json`, root `package.json`
- generated: `apps/web/src/env.ts`, `routeTree.gen.ts`

## PHASER RESPONSIBILITIES

Arena background · two fighters (P1 left, P2 right, facing each other) · idle loops · attack/hit/block/dodge/KO
animations · projectiles (fireball, energy slash) · impact VFX · health bars with smooth drain + white "damage
ghost" · floating damage numbers · hit stop · camera shake & zoom punch · full-screen flash frames · particles ·
round banners ("ROUND 3", "FIGHT!", "BLOCKED!", "K.O.!") · SFX · `onComplete` when the timeline ends.

Fixed logical resolution, portrait: **720 × 1280** with `Phaser.Scale.FIT` + `CENTER_BOTH`, so layout math is constant.
Fighters stand on a ground line around y ≈ 900; health bars at the top; banners at center.

## FIGHTER SYSTEM

Gameplay logic never knows which fighter is on screen. All character specifics come from data:

```ts
// apps/web/src/game/characters/types.ts
export interface AnimationDefinition {
  key: string;                 // texture/atlas key or spritesheet key
  frames?: { start: number; end: number } | number[];
  frameRate?: number;
  repeat?: number;             // -1 loop, 0 once
  /** ms after animation start when the "hit" should register (VFX + shake + HP drain) */
  impactAtMs?: number;
  /** optional: play this VFX at impact / spawn a projectile */
  vfx?: string;
  projectile?: { key: string; speed: number; anim?: string };
  sfx?: string;
}

export interface CharacterDefinition {
  id: Fighter;
  name: string;                            // "BOXER"
  displayName: string;                     // "IRON FIST"
  assets: {
    portrait?: string;                     // /assets/fighters/boxer/portrait.png
    spritesheet?: string;                  // /assets/fighters/boxer/sheet.png (+ frameWidth/Height)
    atlas?: { texture: string; json: string };
    frameWidth?: number; frameHeight?: number;
    scale?: number; originY?: number; tint?: number;   // quick fixes for mismatched packs
  };
  moveNames: Record<Move, string>;         // SPECIAL → "POWER PUNCH" | "ENERGY SLASH" | "FIREBALL"
  animations: {
    idle: AnimationDefinition;
    punch: AnimationDefinition;
    block: AnimationDefinition;
    dodge: AnimationDefinition;
    heavyAttack: AnimationDefinition;
    special: AnimationDefinition;
    hit: AnimationDefinition;
    ko: AnimationDefinition;
    victory?: AnimationDefinition;
  };
  effects?: { punch?: string; heavyAttack?: string; special?: string; impact?: string };
  palette?: { primary: number; glow: number };  // for health bar / particles color
}
```

Rules:
- `FightScene` reads `getCharacter(result.player1.fighter)`; **zero** `if (fighter === "WIZARD")` in scene code.
- Missing animation → fall back to `idle` + tint flash; missing spritesheet → colored rectangle placeholder
  with the fighter name. The scene must never crash on missing art.
- Frame numbers live only in `characters/*.ts`. Swapping a pack = editing one file.
- Same combat system for all three; only presentation differs.

### BOXER / SAMURAI / WIZARD — move presentation

| Move | BOXER | SAMURAI | WIZARD |
|---|---|---|---|
| PUNCH | JAB — quick step + jab, small spark | QUICK SLASH — dash + slash arc | ARCANE BOLT — small magic projectile |
| BLOCK | GUARD UP — gloves up, blue shield shimmer | PARRY — blade raised, metallic ring | MANA WARD — glowing rune circle |
| DODGE | SWAY — lean back with afterimage | SIDESTEP — dash blur | BLINK — vanish + reappear sparkle |
| HEAVY_ATTACK | HAYMAKER — big wind-up, ground crack | HEAVY CLEAVE — overhead slam, screen shake | METEOR — projectile from above |
| SPECIAL | POWER PUNCH — screen flash, giant impact | ENERGY SLASH — wave projectile across screen | FIREBALL — big projectile, explosion |

## ASSET STRATEGY

1. **Validate first (15–20 min):** find packs that have at least idle + one attack + hit + death per archetype.
   Record source/license/URL/frame size in `docs/ASSETS.md`. Only use assets whose license explicitly permits
   our use (CC0, CC-BY with credit, or "free for commercial/personal use" stated by the author). Never
   rip from games.
2. **Reuse aggressively:** one attack animation can serve PUNCH, HEAVY_ATTACK (slower frameRate + zoom +
   bigger shake) and SPECIAL (add projectile + flash + particles). Presentation layers create the variety,
   not more frames.
3. **Placeholder path (always keep working):** colored rectangles or silhouettes with the fighter name,
   scaled/tweened. Ship the whole choreography against placeholders first; swap art later.
4. **VFX:** a few spritesheets (hit spark, explosion, slash arc, fireball) + Phaser particles (`add.particles`)
   with simple circle textures generated at runtime (`make.graphics`) cover most needs.
5. **Audio:** 6–8 short SFX (whoosh, punch, heavy impact, block clank, dodge swoosh, fireball, explosion, KO).
   One optional short loop for the fight. Prefer CC0 (Kenney, freesound CC0).
6. Keep total assets < 10 MB; phones on hotel Wi-Fi will load this.

## VFX STRATEGY (cheap tricks that read as expensive)

- **Hit stop:** `scene.time.timeScale = 0.05` (or `tweens.timeScale`) for 80–120 ms at impact, then restore.
- **Camera shake:** `cameras.main.shake(duration, intensity)`; scale with damage (0.005 punch → 0.02 special).
- **Zoom punch:** quick `zoomTo(1.15, 80)` then back on heavy hits.
- **Flash frame:** full-screen white/colored rectangle, alpha 0.9 → 0 in 120 ms. Red tint on the hit fighter for 150 ms.
- **Impact spark + ring:** sprite or graphics circle scaling 0.2 → 2 with alpha fade.
- **Particles:** emitter burst at impact point, colors from `palette`.
- **Motion trail:** 3–4 ghost copies of the attacker sprite with decreasing alpha during dashes (cheap).
- **Damage numbers:** bold text popping up with `Back.easeOut`, red for hits, blue "BLOCKED", grey "MISS".
- **Health bars:** instant white ghost bar + eased colored drain over 400 ms; flash when < 30 %.

## AUDIO STRATEGY

Mobile browsers block audio until a user gesture. `FightPlayer` should attempt `sound.unlock()`/resume on
mount; MULTIPLAYER's REVEAL screen has a tap ("TAP TO FIGHT") that unlocks the AudioContext before your scene
starts — coordinate in chat. Every SFX call goes through a helper that no-ops if audio is locked. Keep files
short OGG/MP3 (< 100 KB each). Volume around 0.6; never rely on audio for information.

## CombatResult CONTRACT

```ts
interface CombatPlayerResult {
  playerId: string; nickname: string; fighter: Fighter;
  move: Move; power: number;
  damageReceived: number; hpBefore: number; hpAfter: number;
  posePhotoUrl?: string;
}
type CombatOutcome = "P1_HIT" | "P2_HIT" | "BLOCKED" | "DODGED" | "CLASH" | "DOUBLE_HIT" | "STALEMATE" | "KO";
interface CombatResult {
  roundNumber: number;
  player1: CombatPlayerResult;   // host, render on the LEFT
  player2: CombatPlayerResult;   // joiner, render on the RIGHT
  outcome: CombatOutcome;
  winnerPlayerId?: string;       // set on KO
  animationSequence?: string[];  // optional hints; you may ignore and derive from moves + outcome
}
```
`P1_HIT` = player1 **took** damage. Source of truth: `packages/backend/convex/shared/contracts.ts`.

## FIXTURE EXAMPLES (`apps/web/src/game/fixtures/`) — use these exact shapes

```ts
export const FIXTURE_BLOCKED: CombatResult = {
  roundNumber: 1,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "SAMURAI", move: "SPECIAL", power: 91,
             damageReceived: 0, hpBefore: 100, hpAfter: 100, posePhotoUrl: "/assets/debug/pose-p1.jpg" },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "WIZARD", move: "BLOCK", power: 80,
             damageReceived: 15, hpBefore: 100, hpAfter: 85 },
  outcome: "BLOCKED",
};

export const FIXTURE_P2_HIT: CombatResult = {
  roundNumber: 2,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "BOXER", move: "PUNCH", power: 70,
             damageReceived: 0, hpBefore: 85, hpAfter: 85 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "SAMURAI", move: "DODGE", power: 40,
             damageReceived: 7, hpBefore: 100, hpAfter: 93 },
  outcome: "DODGED",
};

export const FIXTURE_DOUBLE_HIT: CombatResult = {
  roundNumber: 3,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "WIZARD", move: "HEAVY_ATTACK", power: 88,
             damageReceived: 27, hpBefore: 85, hpAfter: 58 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "BOXER", move: "SPECIAL", power: 60,
             damageReceived: 21, hpBefore: 93, hpAfter: 72 },
  outcome: "DOUBLE_HIT",
};

export const FIXTURE_CLASH: CombatResult = {
  roundNumber: 4,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "SAMURAI", move: "PUNCH", power: 50,
             damageReceived: 7, hpBefore: 58, hpAfter: 51 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "SAMURAI", move: "PUNCH", power: 55,
             damageReceived: 7, hpBefore: 72, hpAfter: 65 },
  outcome: "CLASH",
};

export const FIXTURE_STALEMATE: CombatResult = {
  roundNumber: 5,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "BOXER", move: "BLOCK", power: 65,
             damageReceived: 0, hpBefore: 51, hpAfter: 51 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "WIZARD", move: "DODGE", power: 70,
             damageReceived: 0, hpBefore: 65, hpAfter: 65 },
  outcome: "STALEMATE",
};

export const FIXTURE_KO: CombatResult = {
  roundNumber: 6,
  player1: { playerId: "p1", nickname: "SANTI", fighter: "WIZARD", move: "SPECIAL", power: 97,
             damageReceived: 0, hpBefore: 51, hpAfter: 51 },
  player2: { playerId: "p2", nickname: "DIEGO", fighter: "BOXER", move: "DODGE", power: 30,
             damageReceived: 34, hpBefore: 20, hpAfter: 0 },
  outcome: "KO",
  winnerPlayerId: "p1",
};
```
Add a `FIXTURES` array and let `/debug/fight` pick any, plus a "random" button and a "play all" loop.

## FIGHT SEQUENCING (target 6–10 s total; every step is a tween/timer with a duration you can tune in one place)

```
0.0 s  intro        both idle · health bars fill to hpBefore · banner "ROUND n" (400 ms)
0.6 s  fight        banner "FIGHT!" + SFX (500 ms)
1.2 s  anticipation attacker(s) crouch/flash/glow (250 ms)
1.5 s  action       per outcome (see table) — dash-in, attack anim, projectile travel, defender anim
       impact       at impactAtMs: hit stop 80–120 ms · shake · flash · spark · particles · defender hit anim · red tint
       damage       floating number · HP bar drains to hpAfter (400 ms)
       label        "BLOCKED!" / "DODGED!" / "CLASH!" / "DOUBLE HIT!" banner where relevant
~5 s   resolve      return to idle · (KO: loser ko anim, slow-mo, "K.O.!", winner victory pose, confetti)
~6 s   done         onComplete()
```

Outcome → choreography (attacker = the player whose move is an attack):

| Outcome | Sequence |
|---|---|
| P1_HIT / P2_HIT | attacker dashes/casts → impact on defender → hit anim + damage |
| BLOCKED | attacker attack → defender block anim + shield VFX → small spark, "BLOCKED!", chip damage number (or none) |
| DODGED | attacker attack → defender dodge (ghost trail / blink) → attack whiffs → "DODGED!" (partial damage if any) |
| CLASH | both dash to center simultaneously → big spark + shake at center → both recoil, both small damage numbers |
| DOUBLE_HIT | staggered: P1 attack lands (impact), then P2 attack lands (impact), 350 ms apart |
| STALEMATE | both do their defensive anim, "…" banner, light comedic sting; keep it short (~2.5 s) |
| KO | play the underlying attack as above; on final impact: slow-mo, zoom, ko anim, "K.O.!" banner, winner pose |

Derive the attacker from moves (`isAttack(move)`); `animationSequence` is optional sugar.

## GAME FEEL REQUIREMENTS

- Every hit has: hit stop + shake + flash + particles + damage number + SFX. No exceptions.
- Heavy/Special hit visibly harder than Punch (bigger shake, longer hit stop, zoom).
- Health drain is eased, never instant; a white ghost shows the lost chunk.
- Idle animations always run; nothing static on screen.
- Text: huge condensed/italic uppercase, thick stroke, drop shadow (e.g. "Bangers"/"Anton"-style; a webfont
  via `<link>` is fine, or Phaser text with bold system font + stroke).
- Total runtime ≤ 10 s; players want the next round.
- 60 fps target on a mid-range phone; if particles cost too much, reduce counts, don't drop effects.

## MOBILE REQUIREMENTS

- Portrait canvas that fills the container: `Scale.FIT` on a 720×1280 logical size, `expandParent: false`.
- `FightPlayer` container: `width:100%; height:100dvh; touch-action:none; overflow:hidden`.
- Destroy the `Phaser.Game` on unmount (`game.destroy(true)`) and be mountable again for the next round;
  cache loaded textures across mounts if simple (or accept a 300 ms reload from HTTP cache).
- Audio unlock via user gesture (see AUDIO). WebGL fallback to Canvas is automatic (`Phaser.AUTO`).
- Assets < 10 MB total, images power-of-two friendly, no single texture > 4096 px.

## ACCEPTANCE TESTS

- [ ] `docs/ASSETS.md` table filled for what you actually use, with license confirmation for each.
- [ ] `/debug/fight` plays every fixture without console errors, on desktop and on a phone.
- [ ] All 3 fighters render with idle + attack + hit + KO (art or placeholder) via `CharacterDefinition` only.
- [ ] Each outcome (8) has a distinct, readable choreography; a spectator can tell what happened without text.
- [ ] Health bars end exactly at `hpAfter`; damage numbers equal `damageReceived`.
- [ ] KO fixture shows KO banner and winner pose; `onComplete` fires after every fixture (≤ 10 s).
- [ ] Mount → unmount → mount again works (no duplicate canvases, no leaked Phaser instances, no audio errors).
- [ ] `bun run check-types` passes.

## INTEGRATION INSTRUCTIONS

- Export **only** `FightPlayer` (and its props type) from `apps/web/src/game/index.ts`:
  ```tsx
  <FightPlayer result={combatResult} onComplete={() => advance()} />
  ```
- MULTIPLAYER mounts it in `/room/$code` after the REVEAL screen; it will already have shown photos/nicknames,
  so your scene may show nicknames on health bars but does not need to show photos (optional: small portraits).
- Do not read Convex, URL params, or global state; everything arrives via `result`.
- Announce in chat when `FightPlayer` handles all fixtures — that's the integration signal.
- Optional export `preloadFightAssets(fighters: Fighter[])` MULTIPLAYER can call during the lobby.

## STRETCH GOALS (after MVP only)

- Portraits + nicknames in a VS intro card inside the scene.
- Secret move "THUNDER GOD" presentation (needs contract change).
- Boss "THE VOID KING" sprite + 2v1 layout (co-op).
- Team combo names (DOUBLE STRIKE / COUNTER ASSAULT / TWIN DRAGON) banners.
- Extra arenas (parallax backgrounds), round-recap replay, shareable battle card (canvas → PNG).
