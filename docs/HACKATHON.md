# POSE FIGHT — Hackathon War Room

```
START TIME:    ____:____      (fill in when the clock starts)
CURRENT TIME:  ____:____
DEADLINE:      ____:____      (START + 4:00)
MVP FREEZE:    ____:____      (START + 2:00)  — after this, NOTHING new. Only make the loop work and look good.
```

Team: Dev 1 = VISION (`ws/vision`) · Dev 2 = GAME (`ws/game`) · Dev 3 = MULTIPLAYER + integration (`ws/multiplayer`)

Chat conventions: `🔗 SHARED URL`, `✅ EXPORTED <Component>` (integration signal), `🚨 BLOCKED`, `📜 CONTRACT CHANGE`.

---

## Priorities

**MUST HAVE (MVP)** — two phones · room code · nickname + fighter · pose capture on device · secret submission ·
Convex resolution · both photos on reveal · same animated fight on both phones · HP · KO · winner screen · deployed HTTPS URL.

**SHOULD HAVE** — fighter-specific VFX/projectiles · SFX · arcade typography · reveal 3·2·1 FIGHT! · rematch · QR/deep link ·
`?fake=1` demo insurance · reload recovery · round timer with auto-BLOCK.

**STRETCH** (only after MVP passes on two real phones) — secret pose THUNDER GOD · co-op boss THE VOID KING · team combos ·
more arenas/fighters · replay / recap · shareable battle card · spectator screen.

**DO NOT BUILD** — auth · accounts · matchmaking · leaderboards · physics fighting · custom websockets · Supabase/Firebase/Redis ·
Redux · frame-by-frame custom animation · pixel-perfect balance · production hardening · tests beyond the combat resolver self-check.

---

## MILESTONE 0 — Battlefield ready (T+0:00 → 0:15) — tech lead

- [x] Repo inspected; docs written (`AGENTS.md`, `docs/**`); contracts in `packages/backend/convex/shared/contracts.ts`
- [x] Directory skeleton + `.gitkeep`; `apps/web/.env.example`
- [ ] Pushed to `main`
- [ ] Deps added on `main` in one commit: `cd apps/web && bun add @mediapipe/tasks-vision phaser` (avoids 3-way lockfile conflicts)
- [ ] Branches created: `ws/vision`, `ws/game`, `ws/multiplayer`
- [ ] Dev 3: `bun run dev:setup` → Convex provisioned → `🔗 SHARED URL` posted → everyone's `apps/web/.env` set → `bun run dev:web` boots for all
- [ ] Dev 2: asset research started, `docs/ASSETS.md` rows being filled
- [ ] Dev 1: `cloudflared`/`ngrok` installed for phone HTTPS testing
- [ ] Vercel linked (`bun run deploy:setup`) by Dev 3 (can slip to Milestone 2)

## MILESTONE 1 — Three isolated prototypes (T+0:15 → 1:30)

VISION
- [ ] `/debug/vision`: camera + skeleton on desktop
- [ ] 5 poses classified with live confidence/power overlay
- [ ] `CaptureScreen` exported (`✅ EXPORTED CaptureScreen`) — countdown → `onCapture({ pose, photo })`
- [ ] Works on a phone over HTTPS (iOS Safari + Android Chrome)

GAME
- [ ] Assets validated + licensed (or placeholder decision made)
- [ ] `/debug/fight` plays all fixtures against placeholders
- [ ] `CharacterDefinition` for BOXER / SAMURAI / WIZARD
- [ ] Hit stop + shake + flash + particles + damage numbers + health bars
- [ ] `FightPlayer` exported (`✅ EXPORTED FightPlayer`) — `onComplete` fires
- [ ] Runs on a phone

MULTIPLAYER
- [ ] Schema + create/join/getRoomView/startBattle
- [ ] `resolveRound` + self-check passes
- [ ] `submitMove` resolves in-mutation; secrecy verified in network tab
- [ ] `/room/$code` state machine with fake buttons; two windows play to KO
- [ ] Photo upload → `posePhotoUrl` in result; text reveal
- [ ] Two phones via tunnel play to KO with fake buttons

## MILESTONE 2 — First integration (T+1:30 → 2:00)

- [ ] All branches rebased on `main`, `bun run check-types` green, merged to `main`
- [ ] Dev 3 mounts `<CaptureScreen/>` in ChooseMove and `<FightPlayer/>` after reveal
- [ ] Real pose → Convex → `CombatResult` → Phaser on **two phones**
- [ ] `?fake=1` still works (demo insurance)
- [ ] Preview deployed to Vercel with the Convex URL (`bun run env:preview && bun run deploy`)
- [ ] **T+2:00 — MVP FEATURE FREEZE.** If the loop fails, everyone swarms the loop. No boss, no secrets, nothing new.

## MILESTONE 3 — MVP verified (T+2:00 → 2:20)

Run the MVP script on two real phones, deployed URL, different networks if possible:
- [ ] Create → code → join → nicknames + fighters → START
- [ ] Both CHOOSE YOUR MOVE → pose → LOCKED → neither sees the other's move
- [ ] Reveal shows both real photos → FIGHT! → same animation on both → same HP
- [ ] Next round → … → KO → winner screen on both
- [ ] Reload one phone mid-battle → recovers

## MILESTONE 4 — Polish (T+2:20 → 3:15)

- [ ] Reveal screen: big photos, move flavor names, POWER/DEFENSE, 3·2·1 FIGHT! with SFX
- [ ] Lobby VS card, huge room code, fighter portraits, arcade font
- [ ] Fighter-specific VFX (Power Punch / Energy Slash / Fireball), KO slow-mo, victory pose
- [ ] Audio unlocked via "TAP TO FIGHT"; SFX on every hit
- [ ] Pose calibration pass with 3 different bodies; thresholds tuned; retry on low confidence
- [ ] Rematch button; winner screen with both final photos
- [ ] Remove scaffold leftovers (Header, ASCII art), set title/favicon
- [ ] Should-haves only if they don't touch the working loop

## MILESTONE 5 — Demo ready (T+3:15 → 4:00)

- [ ] Production deploy (`bun run deploy:prod`; Convex prod or dev URL confirmed in Vercel env)
- [ ] iOS Safari pass: camera permission, `playsInline`, audio unlock, no scroll bounce, safe areas
- [ ] Android Chrome pass
- [ ] Phones charged, brightness up, do-not-disturb on, same Wi-Fi/hotspot tested, fallback hotspot ready
- [ ] `?fake=1` fallback rehearsed in case a camera fails on stage
- [ ] Demo rehearsal ×3 (full battle < 3 min). Script: hook line → create/join → pose → reveal laugh → fight → KO
- [ ] Freeze `main`. No commits after the last rehearsal unless something is on fire
- [ ] Backup: screen recording of a full battle saved on a laptop

---

## Contract change requests (append; needs 👍 from the other two devs before editing `contracts.ts`)

| Time | Requester | Change (additive preferred) | Why | Status |
|---|---|---|---|---|
| | | | | |

## Blockers log

| Time | Who | Blocker | Resolution |
|---|---|---|---|
| | | | |

## Decisions log

| Time | Decision |
|---|---|
| T+0 | Shared contracts live in `packages/backend/convex/shared/contracts.ts`; no new package |
| T+0 | Added `STALEMATE` outcome and `winnerPlayerId` to `CombatResult`; `CaptureOutput` wraps `PoseResult` + photo Blob |
| T+0 | Round resolves inside the second `submitMove` mutation; no scheduler |
| T+0 | Player identity = random token in localStorage; no auth |
| T+0 | Phaser logical canvas 720×1280 portrait, `Scale.FIT` |
| T+0 | Damage: PUNCH 15 · HEAVY 25 · SPECIAL 30; power multiplier 0.85–1.15 |
