# WORKSTREAM 3 — CONVEX + MULTIPLAYER + COMBAT + APP FLOW

Read `/AGENTS.md` first. This doc only adds detail for the MULTIPLAYER agent.

## MISSION

Make two phones participate reliably in the same battle: rooms, join codes, secret move submission,
photo storage, **authoritative** round resolution on Convex, realtime sync, HP, KO. You also own the
app screens and routing, and you are the **integration hub**: at T+1:30 you mount VISION's
`CaptureScreen` and GAME's `FightPlayer` inside `/room/$code`.

## CONTEXT

- Backend: `packages/backend/convex/` — Convex 1.45, **schema is empty** (`defineSchema({})`), one sample
  query `healthCheck.ts`. `convex.config.ts` is a plain `defineApp()`.
- Web: `apps/web` TanStack Start (SSR). Convex client is already wired: `router.tsx` creates a
  `ConvexQueryClient`, `__root.tsx` wraps in `<ConvexProvider>`. You can use either
  `useQuery(convexQuery(api.x.y, args))` (TanStack Query, SSR-friendly) or plain `useQuery`/`useMutation`
  from `convex/react`. For realtime game state the plain `convex/react` hooks are simplest.
- **Convex is not provisioned.** Your very first action: `bun run dev:setup` (creates
  `packages/backend/.env.local`), copy the URL into `apps/web/.env` as `VITE_CONVEX_URL`, and **post the URL
  in team chat** — the other two devs need it to boot the app. Only you run `convex dev` (function push);
  they just point at your dev deployment.
- Env schema: `apps/web/.env.schema` rejects `example.convex.*`; `apps/web/.env` is gitignored.
- No auth. Identify players with a client-generated token (`crypto.randomUUID()` in `localStorage`).

## OWNED DIRECTORIES

```
packages/backend/convex/**                (EXCEPT shared/contracts.ts — tech-lead owned)
apps/web/src/features/multiplayer/**
apps/web/src/routes/index.tsx             home: CREATE BATTLE / JOIN
apps/web/src/routes/room/**               /room/$code — entire game flow
apps/web/src/routes/__root.tsx            app shell: title "POSE FIGHT", viewport, remove scaffold Header
apps/web/src/components/**                scaffold leftovers; delete or replace
apps/web/src/index.css                    may add game fonts/colors (announce in chat first)
```

Suggested layout:

```
packages/backend/convex/
  schema.ts                      rooms, players, submissions, rounds
  rooms.ts                       createRoom, joinRoom, getRoom (by code), startBattle, leaveRoom
  players.ts                     setProfile (nickname, fighter), heartbeat (optional)
  rounds.ts                      submitMove (resolves when both are in), getRoundResult, readyForNextRound
  photos.ts                      generateUploadUrl
  combat/resolve.ts              PURE resolveRound(p1, p2, ...) → CombatResult   ← unit-testable, no ctx
  combat/rules.ts                base damage, interaction table, power modifier
  lib/roomCode.ts                4-char code generator (no 0/O/1/I)
  lib/ids.ts                     token → player lookup helpers
apps/web/src/features/multiplayer/
  index.ts
  usePlayerToken.ts              localStorage token
  useRoom.ts                     subscribe to room view for this token
  screens/HomeScreen.tsx         CREATE / JOIN
  screens/LobbyScreen.tsx        code, QR/link, nickname, fighter picker, ready/start
  screens/ChooseMoveScreen.tsx   wraps <CaptureScreen/> (or FakeMoveButtons in dev) + "MOVE LOCKED ✓ / waiting"
  screens/RevealScreen.tsx       photos side by side, moves, POWER/DEFENSE, 3·2·1 FIGHT! (tap to unlock audio)
  screens/FightScreen.tsx        wraps <FightPlayer result onComplete/>
  screens/ResultScreen.tsx       KO / WINNER, rematch, new room
  FakeMoveButtons.tsx            PUNCH BLOCK DODGE HEAVY SPECIAL + power slider (dev only, `?fake=1`)
  RoomStateMachine.ts            derive current screen from room status + my submission state
```

## FILES IT MAY MODIFY

Everything above. Import shared types relatively in Convex (`./shared/contracts`) and via
`@posefighter/backend/convex/shared/contracts` in web code. Use `MOVES`/`FIGHTERS` arrays to build
Convex validators: `v.union(...MOVES.map((m) => v.literal(m)))`.

## FILES IT MUST NOT MODIFY

- `packages/backend/convex/shared/contracts.ts` (AGENTS.md §6.4)
- `apps/web/src/features/vision/**`, `apps/web/src/game/**`, `apps/web/src/routes/debug/**`, `apps/web/public/assets/**`
- `packages/ui/**`, `vite.config.ts`, `turbo.json`, root `package.json`
- generated files: `_generated/**` (Convex writes it), `apps/web/src/env.ts`, `routeTree.gen.ts`

## CONVEX RESPONSIBILITIES

Rooms · players · rounds · secret submissions · photo storage · **single authoritative resolution** ·
realtime views · HP · KO/winner · idempotent round advance · basic recovery (reload page → same token → same seat).

## SUGGESTED DATA MODEL (`schema.ts`)

```ts
rooms: {
  code: string;                         // "K7DX", indexed
  status: "LOBBY" | "IN_ROUND" | "REVEAL" | "FINISHED";
  roundNumber: number;                  // starts at 1 when battle starts
  hostToken: string;
  winnerPlayerId?: Id<"players">;
  createdAt: number;
}  .index("by_code", ["code"])

players: {
  roomId: Id<"rooms">;
  token: string;                        // client secret; never returned in room views for the OTHER player
  seat: 1 | 2;
  nickname: string;
  fighter: Fighter;
  hp: number;                           // MAX_HP = 100
  ready: boolean;
  lastSeenAt: number;
}  .index("by_room", ["roomId"]).index("by_token", ["token"])

submissions: {
  roomId: Id<"rooms">;
  roundNumber: number;
  playerId: Id<"players">;
  move: Move; power: number; confidence: number;
  photoStorageId?: Id<"_storage">;
  createdAt: number;
}  .index("by_room_round", ["roomId", "roundNumber"])

rounds: {
  roomId: Id<"rooms">;
  roundNumber: number;
  result: CombatResult;                 // store the full object (v.any() is acceptable for the hackathon)
  readyPlayerIds: Id<"players">[];      // who finished watching the animation
  resolvedAt: number;
}  .index("by_room_round", ["roomId", "roundNumber"])
```

Store `posePhotoUrl` **resolved at read time** with `ctx.storage.getUrl(storageId)` inside the query, or store
the URL string at resolution time (simpler; URLs from `getUrl` are long-lived enough for a demo).

## ROOM FLOW

1. `createRoom({ token, nickname?, fighter? })` → generates unique 4-char code (retry on collision), inserts room
   (LOBBY) + host player (seat 1) → returns `{ code }`. Client navigates to `/room/K7DX`.
2. Lobby shows code big, deep link `https://<host>/room/K7DX`, optional QR (`qrcode.react` or an `<img>` from a
   public QR API — only if time allows; the code is enough for the demo).
3. Both set nickname + fighter (`setProfile`). Show both cards with portraits when both present.
4. `startBattle({ code, token })` — host only, requires 2 players with profiles → `status: IN_ROUND`, `roundNumber: 1`, both `hp = 100`.

## JOIN FLOW

`joinRoom({ code, token, nickname?, fighter? })`: room must exist and be `LOBBY` with < 2 players; if the token
already belongs to a player in that room, return that player (reconnect). Codes are uppercase, ambiguous chars
excluded (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Deep link `/room/$code` auto-joins if the user has no seat.

## MOVE SUBMISSION

`submitMove({ code, token, roundNumber, move, power, confidence, photoStorageId? })`:
- Validate: room `IN_ROUND`, `roundNumber === room.roundNumber`, player belongs to room, **no existing submission**
  for (room, round, player) — if one exists, return `{ locked: true }` (idempotent, protects against double taps).
- Insert submission. Then count submissions for (room, round). If **2**: resolve immediately in the same mutation
  (see ROUND RESOLUTION). Convex mutations are serializable transactions, so two simultaneous submits cannot both
  see "1"; exactly one of them sees 2 and resolves. This is the whole secrecy + single-resolution mechanism.
- Return `{ locked: true, resolved: boolean }`.

## MOVE SECRECY (critical requirement)

Clients can only read data through your queries, so secrecy = **never return the opponent's submission**:

- `getRoomView({ code, token })` returns: room status, roundNumber, both players' public profile + hp,
  `me: { seat, hasSubmitted, myMove? }`, `opponent: { hasSubmitted: boolean }` — **no move, power, or photo** for the opponent.
- The opponent's move/power/photo appear **only** inside `rounds.result` (the `CombatResult`), which exists only
  after resolution. `getRoundResult({ code, token, roundNumber })` returns it.
- Never expose `submissions` documents directly. Never return other players' `token`.
- Don't put opponent data in a query "just for debugging" — use the Convex dashboard instead.

## PHOTO STORAGE

1. Client: `const url = await generateUploadUrl()` (mutation) → `fetch(url, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: photo })`
   → `{ storageId }`.
2. Pass `photoStorageId` to `submitMove`. If the upload fails, submit without it (never block the round on a photo).
3. At resolution store `posePhotoUrl: await ctx.storage.getUrl(id)` into each `CombatPlayerResult`.
4. Upload happens in parallel with showing "MOVE LOCKED ✓" — keep the UI snappy.

## ROUND RESOLUTION (`combat/resolve.ts`, pure)

```ts
resolveRound(input: {
  roundNumber: number;
  p1: { playerId, nickname, fighter, move, power, hp, posePhotoUrl? };
  p2: { ...same };
}): CombatResult
```
Rules are in `docs/GAME_DESIGN.md` (base damage, interaction table, power multiplier 0.85–1.15, outcome
derivation, KO and tiebreak). Implement exactly that; balance tweaks go in `combat/rules.ts` constants.
After resolving: update both `players.hp`, insert `rounds` doc, set `room.status = "REVEAL"`; if someone hit 0,
set `room.status = "FINISHED"` and `winnerPlayerId`.

Write a tiny self-check (a dev-only `internalQuery` or a plain `.test.ts` run with `bun test` inside
`packages/backend`) covering: PUNCH vs BLOCK → BLOCKED; HEAVY vs BLOCK → P?_HIT full; SPECIAL vs DODGE → full;
HEAVY vs DODGE → DODGED 0 dmg; same attack → CLASH; BLOCK vs DODGE → STALEMATE; hp→0 → KO + winner.

## HP

`MAX_HP = 100`. Clamp at 0. Damage values (`docs/GAME_DESIGN.md`) target 4–7 rounds per battle so a demo fits
in ~3 minutes. HP lives on `players`; `CombatResult` carries `hpBefore/hpAfter` for presentation.

## ROUND TRANSITIONS

`readyForNextRound({ code, token, roundNumber })`: adds player to `rounds.readyPlayerIds` (idempotent). When both
are ready **and** room is `REVEAL` **and** `room.roundNumber === roundNumber`: `roundNumber += 1`, `status = IN_ROUND`.
Add a fallback: the host's client may call `forceNextRound` after 20 s of waiting (a phone locked mid-animation
shouldn't stall the game).

## REALTIME

One reactive query drives everything: `useQuery(api.rooms.getRoomView, { code, token })`. Derive the screen:

```
status LOBBY                        → LobbyScreen
status IN_ROUND & !me.hasSubmitted  → ChooseMoveScreen (CaptureScreen or FakeMoveButtons)
status IN_ROUND &  me.hasSubmitted  → "MOVE LOCKED ✓ — waiting for {opponent}" (with opponent.hasSubmitted indicator)
status REVEAL                       → RevealScreen (photos, moves, 3·2·1 FIGHT!) → FightScreen(FightPlayer) → readyForNextRound
status FINISHED                     → ResultScreen (winner, rematch)
```
Both phones see the same `CombatResult` because both subscribe to the same document. Keep local UI state
(reveal countdown done, animation done) in React; keep game truth in Convex.

## CombatResult CONTRACT

See `packages/backend/convex/shared/contracts.ts`. `player1` = seat 1 (host), `player2` = seat 2. `outcome` is
neutral (`P1_HIT` = player1 took damage). `KO` overrides; set `winnerPlayerId`.

## FAKE MOVE TESTING (you must not wait for MediaPipe or Phaser)

- `FakeMoveButtons`: five big buttons PUNCH · BLOCK · DODGE · HEAVY · SPECIAL + a power slider (0–100). Enabled
  with `?fake=1` on `/room/$code` (or always in `import.meta.env.DEV`). It produces a `CaptureOutput` with a
  1×1 placeholder JPEG Blob (or no photo) and calls the same submit path the real `CaptureScreen` will use.
- Until `FightPlayer` exists, `FightScreen` shows a plain text summary of the `CombatResult` ("SANTI SPECIAL 91
  vs DIEGO BLOCK 80 → BLOCKED · DIEGO −15 → 85") with a "CONTINUE" button that calls `readyForNextRound`.
- Test with two browser windows (one incognito → different token) first, then two phones via tunnel/Vercel.

## IMPLEMENTATION PLAN (≈75 min)

1. **(5)** `bun run dev:setup`, share URL, `bun run dev`. Set `__root.tsx` title/viewport, drop Header.
2. **(15)** `schema.ts`, `rooms.ts` (create/join/getRoomView/startBattle), `lib/roomCode.ts`. Home + Lobby screens.
3. **(15)** `combat/rules.ts` + `combat/resolve.ts` + self-check. `rounds.ts` submitMove with in-mutation resolution.
4. **(15)** `/room/$code` state machine, ChooseMove with FakeMoveButtons, locked/waiting, text-only reveal/result,
   `readyForNextRound`. Two-window test through KO.
5. **(10)** `photos.ts` + upload path + `posePhotoUrl` in result; RevealScreen with two photos + 3·2·1 FIGHT!
6. **(15)** Phone test ×2 via tunnel; reconnect by reload; polish lobby (fighter cards, big code).
7. **T+1:30 integration:** swap FakeMoveButtons → `<CaptureScreen/>` (keep fake behind `?fake=1`), text result →
   `<FightPlayer/>`.

## ACCEPTANCE TESTS

- [ ] Create room → code shown; join from another browser → both appear in lobby with nickname + fighter.
- [ ] Start → both see CHOOSE YOUR MOVE for round 1.
- [ ] P1 submits; P1 sees LOCKED; P2's view shows "opponent locked" but **no move/power/photo anywhere in the network
      payload** (verify in DevTools → WS frames / Convex dashboard).
- [ ] P2 submits → both receive the identical `CombatResult` within ~1 s; HP matches on both.
- [ ] Double-tap submit or resubmit does not create a second submission or a second resolution.
- [ ] Both ready → round 2 starts; round counter increments once.
- [ ] HP reaches 0 → `KO`, `winnerPlayerId` set, `FINISHED`, winner screen on both; rematch or new room works.
- [ ] Reload mid-battle → same seat and screen restored from token.
- [ ] Photos upload and appear in the reveal on both phones.
- [ ] Works on two real phones over HTTPS. `bun run check-types` passes.

## INTEGRATION INSTRUCTIONS

- **VISION** exports `CaptureScreen` from `@/features/vision` with `onCapture(output: CaptureOutput)`. Mount it in
  ChooseMoveScreen; on capture: upload `output.photo` → `submitMove({ move: output.pose.move, power: output.pose.power,
  confidence: output.pose.confidence, photoStorageId })`. Show "MOVE LOCKED ✓ PUNCH · POWER 87" immediately.
- **GAME** exports `FightPlayer` from `@/game` with `result` + `onComplete`. Mount after the reveal countdown; on
  complete call `readyForNextRound`. The reveal's "TAP TO FIGHT" tap unlocks audio for Phaser — keep a user gesture
  right before mounting `FightPlayer`.
- Both components are client-only: give `/room/$code` `ssr: false`.
- Keep `?fake=1` working after integration; it is our demo insurance if a camera fails on stage.
- You are the integrator: at T+1:30 pull `main`, wire both components, run the two-phone test, report in chat.

## STRETCH GOALS (after MVP only)

- Rematch in the same room (reset hp, roundNumber 1, keep players).
- Round timer (auto-submit BLOCK after 15 s) — improves demo pacing.
- QR code in lobby; spectator view (`/room/$code/watch`, read-only, big screen for the audience!).
- Team combos / co-op boss (`THE VOID KING`) — needs new room modes; do not start before MVP.
- Round recap list; shareable final battle card.
