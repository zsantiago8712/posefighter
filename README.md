# POSE FIGHT 🥊⚔️🔮

> **Your body is your controller.**

Online 1v1 fighting game where your **physical pose** is the input. Point your phone or laptop camera at
yourself, strike a pose during the 3‑2‑1 countdown, and your move is classified **on‑device**, submitted
secretly, and revealed together with your opponent's. Both players then watch the same cinematic 2D fight
with real photos of the poses that caused it.

Built in a 4‑hour hackathon by a 3‑person team with AI coding agents working in parallel.

## ▶️ Play it

**🌐 Live:** `https://<production-domain>.vercel.app` ← *(paste the production domain from Vercel → Domains)*

1. Open the link on two devices (phone or PC). HTTPS is required for the camera.
2. **⚡ Quick Match** to be paired with a random player, or **Create private battle** and share the 4‑letter code / invite link.
3. Tap **Enable camera**, pick a fighter (Boxer · Samurai · Wizard). The battle starts when both have picked.
4. When the camera counts down, strike a pose:

| Move | Pose | Beats |
|---|---|---|
| 👊 **PUNCH** | one arm straight out | reliable damage |
| 🛡️ **BLOCK** | arms crossed on chest | PUNCH |
| 💨 **DODGE** | lean hard to one side | HEAVY |
| 💥 **HEAVY** | wide stance + arm out | BLOCK |
| ⚡ **SPECIAL** | both hands over head | DODGE |

5. Watch the fight, repeat until someone hits 0 HP. **KO → rematch.**

Testing alone? In the lobby use **"open player 2 in a new tab"**. No camera? Add `?fake=1` to the room URL for move buttons.

## ✨ What we built

- **Vision (on‑device):** MediaPipe PoseLandmarker → 33 landmarks → geometric rules (elbow angles, torso lean, wrist positions normalized by shoulder width) → `PoseResult { move, confidence, power }` + a JPEG snapshot. Live overlay shows the detected move during the countdown. Debug page at `/debug/vision` with skeleton, angles, thresholds sliders.
- **Multiplayer (Convex, authoritative):** rooms with 4‑letter codes, Quick Match queue, per‑tab anonymous identity, secret move submission (the opponent only sees "locked"), round resolved **once** inside the second `submitMove` mutation, HP/KO/winner, rematch, reconnect on reload, host fallback when the other phone stalls.
- **Game (Phaser 3):** data‑driven `FightScene` fed only by a `CombatResult`: fighters from `CharacterDefinition` configs, projectiles, hit stop, camera shake, flashes, particles, damage numbers, health bars, KO slow‑mo. CC0 sprites & SFX (see `docs/ASSETS.md`). Fixture player at `/debug/fight`.
- **One battle screen:** the Phaser arena is always mounted; on desktop the camera lives on the right, on phones in a bottom dock. Moves are captured, the cinematic plays in place, real pose photos appear beside it, next round starts automatically.
- **Robustness:** camera error / unreadable pose / timeout → random move so a round never stalls; text fallback if WebGL fails; audio unlocked from the lobby tap (mobile autoplay rules).
- **Privacy:** photos are used only to show the pose to your opponent during the match and are **deleted automatically** 5 minutes after the KO (and immediately on rematch). Pose detection never leaves the device.
- **Pose guide:** Material Symbols person icons for the five poses in the lobby and battle screen.

## 🧱 Architecture

```
CAMERA → VISION (MediaPipe, on device) → PoseResult + photo
       → MULTIPLAYER (Convex: rooms · secret moves · resolveRound → CombatResult · storage)
       → GAME (Phaser: presents the CombatResult, never computes damage)
```

Three independent systems, one shared contracts file: `packages/backend/convex/shared/contracts.ts`.
Full docs: [`AGENTS.md`](./AGENTS.md) · [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) ·
[`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md) · [`docs/agents/`](./docs/agents/) (per‑workstream briefs) ·
[`docs/HACKATHON.md`](./docs/HACKATHON.md) (war room log).

### Combat rules (deterministic)

Base damage PUNCH 15 · HEAVY 25 · SPECIAL 30. BLOCK takes 20 % of a PUNCH, 50 % of a SPECIAL, 100 % of a HEAVY.
DODGE takes 50 % of a PUNCH, 0 % of a HEAVY, 100 % of a SPECIAL. Same attack → CLASH (both 50 %); different
attacks → DOUBLE HIT; two defenses → STALEMATE. Pose quality (`power` 0–100) scales damage ×0.85–1.15. 100 HP.

## 🛠 Stack

TanStack Start (React 19, Vite 8, Nitro) · Convex · MediaPipe Tasks Vision · Phaser 3.90 · Tailwind 4 · shadcn/ui ·
Bun + Turborepo · Vercel. Scaffolded with [Better‑T‑Stack](https://better-t-stack.dev).

```
apps/web/src/features/vision       camera, MediaPipe, classifier, debug overlay
apps/web/src/features/multiplayer  screens, room state machine, Quick Match, camera check, pose guide
apps/web/src/game                  Phaser scenes, characters, VFX, audio, fixtures
packages/backend/convex            schema, rooms, rounds, photos, combat/resolve (+ tests)
```

## 🚀 Run locally

```bash
bun install
bun run dev:setup                       # once: creates a Convex dev deployment (writes packages/backend/.env.local)
cp apps/web/.env.example apps/web/.env  # set VITE_CONVEX_URL=https://<deployment>.convex.cloud
bun run dev                             # web on http://localhost:3001 + convex dev
```

Two players on one PC: open `http://localhost:3001`, create a battle, use **open player 2 in a new tab**.
Phones need HTTPS: `bun run dev:web -- --host` then `ngrok http 3001` (tunnel hosts are allowed in `vite.config.ts`).

Useful: `/debug/vision` (pose calibration) · `/debug/fight` (animations by fighter/outcome) · `?fake=1` (buttons instead of camera).

```bash
bun run check-types                 # typecheck + build every package
cd packages/backend && bun test     # combat resolver tests
```

## ☁️ Deploy

- **Vercel** is connected to this repo: every push to `main` deploys production. Project root `apps/web`,
  install command `cd ../.. && bun install`, env `VITE_CONVEX_URL`. Disable *Deployment Protection* so
  other devices can open the URL.
- **Convex**: the app points at the dev deployment used during the hackathon; functions are pushed with
  `bun run dev:server` (or `bunx convex deploy` for a production deployment, then update `VITE_CONVEX_URL`).

## 🎯 Stretch ideas

Secret pose "THUNDER GOD" · co‑op boss battle vs THE VOID KING · team combos · more arenas & fighters ·
round recap with all photos · shareable battle card · spectator screen for the audience.

## 📜 Credits & licenses

Sprites, VFX and SFX are CC0 (OpenGameArt, Kenney); pose icons are Google Material Symbols (Apache 2.0);
font Bangers (OFL). Full inventory in [`docs/ASSETS.md`](./docs/ASSETS.md).
