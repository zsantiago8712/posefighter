# POSE FIGHT — Architecture

Three independent systems, two data contracts, one authority (Convex).

```
        PLAYER 1 PHONE                                   PLAYER 2 PHONE
   ┌─────────────────────┐                          ┌─────────────────────┐
   │       CAMERA        │                          │       CAMERA        │
   │         │           │                          │         │           │
   │   VISION (MediaPipe)│                          │   VISION (MediaPipe)│
   │   landmarks→rules   │                          │   landmarks→rules   │
   │         │           │                          │         │           │
   │   CaptureOutput     │                          │   CaptureOutput     │
   │   {PoseResult,photo}│                          │   {PoseResult,photo}│
   └─────────┼───────────┘                          └─────────┼───────────┘
             │ submitMove (mutation)                          │ submitMove (mutation)
             │ + photo upload (storage)                       │ + photo upload (storage)
             ▼                                                ▼
   ══════════════════════════════════════════════════════════════════════════
                                  CONVEX  (authoritative)
        rooms · players · submissions (secret) · rounds · _storage
        second submitMove of the round → resolveRound() ONCE → CombatResult
   ══════════════════════════════════════════════════════════════════════════
             │ getRoomView / getRoundResult (reactive queries)              │
             ▼                                                              ▼
   ┌─────────────────────┐                                     ┌─────────────────────┐
   │  REVEAL (React)     │                                     │  REVEAL (React)     │
   │  both photos, moves │                                     │  both photos, moves │
   │         │           │                                     │         │           │
   │   CombatResult      │        identical document           │   CombatResult      │
   │         │           │                                     │         │           │
   │   GAME (Phaser)     │                                     │   GAME (Phaser)     │
   │   FightScene        │                                     │   FightScene        │
   │   CINEMATIC FIGHT   │                                     │   CINEMATIC FIGHT   │
   └─────────────────────┘                                     └─────────────────────┘
```

## Pipeline

```
CAMERA → VISION → PoseResult (+photo) → MULTIPLAYER (Convex) → CombatResult → GAME → animated fight
```

## Authoritative boundaries

| Question | Who decides | Who must NOT decide |
|---|---|---|
| Which move did I perform? | **VISION**, on the player's own device | Convex (it trusts the client; anti-cheat is out of scope) |
| Is the move locked? Did both submit? | **Convex** | clients |
| Who hit whom, how much damage, HP, KO, winner | **Convex** `resolveRound` (pure function, runs inside the second `submitMove` mutation) | VISION, GAME, any client code |
| When does the next round start? | **Convex** (`readyForNextRound` from both, or host force) | a single client |
| How does the fight look? | **GAME**, entirely from `CombatResult` | Convex never sends animation details beyond optional hints |
| Which screen is shown? | **MULTIPLAYER** React layer, derived from room status + own submission state | VISION / GAME never navigate |

### Why the second mutation resolves the round
Convex mutations are serializable transactions. Two players submitting "simultaneously" still execute one after
the other; exactly one sees two submissions and resolves. No cron, no scheduler, no race. The result is a
document both clients already subscribe to, so both phones receive the same `CombatResult` reactively.

### Why moves stay secret
Clients only see data through queries. Queries return the opponent's `hasSubmitted` flag and nothing else until
the `rounds` document exists. Photos are only referenced from the resolved result.

## Independence rules

- **VISION** knows nothing about Convex or Phaser. Its only outputs are a `PoseResult` and a JPEG Blob via a callback.
- **MULTIPLAYER** does no computer vision and never drives Phaser. It hands a `CombatResult` to a React component.
- **GAME** does no pose recognition and never computes damage. It receives `CombatResult` and presents it.
- The only shared code is `packages/backend/convex/shared/contracts.ts` (types + constants).

## Code map (actual repository)

```
apps/web/src/features/vision/     VISION       → exports <CaptureScreen onCapture/>
apps/web/src/game/                GAME         → exports <FightPlayer result onComplete/>
apps/web/src/features/multiplayer MULTIPLAYER  → Convex hooks + screens; composes the two above in routes/room/$code.tsx
packages/backend/convex/          MULTIPLAYER  → schema, mutations, queries, combat/resolve.ts
packages/backend/convex/shared/   SHARED       → contracts.ts
```

## Runtime & platform notes

- **SSR:** TanStack Start renders routes on the server first. Camera and Phaser routes use `ssr: false` and dynamic
  imports; no `window` at module scope.
- **Client identity:** random token in `localStorage`; a reload restores the same seat. No auth by design.
- **Photos:** Convex file storage (`generateUploadUrl` → POST → `storageId` → `getUrl`). Photos are optional; the round
  never blocks on an upload failure.
- **HTTPS:** camera access on phones requires it. Dev via tunnel (`cloudflared`/`ngrok`), demo via Vercel preview/prod.
- **Deployment:** Vercel (`vercel.json` → `apps/web`), Convex cloud (`npx convex deploy` for prod; dev deployment is fine
  for the demo if we're short on time — just make sure `VITE_CONVEX_URL` in Vercel points at it).
- **Realtime cost:** one reactive query per client (`getRoomView`) plus one for the current round result. Nothing polls.

## Failure modes we accept for a 4-hour demo

- No anti-cheat: a client could submit a move it didn't perform. Fine.
- No server-side timers: if a player walks away, the other waits (host has a "force next round" fallback).
- No schema migrations: `rounds.result` is stored as `v.any()`.
- No reconnection beyond token-based re-subscription.
