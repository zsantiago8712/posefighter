# WORKSTREAM 1 — VISION + CAMERA + CAPTURE UX

Read `/AGENTS.md` first. This doc only adds detail for the VISION agent.

## MISSION

Turn a human body in front of a mobile phone into a reliable `PoseResult` plus a JPEG snapshot,
entirely on-device, and hand both to the multiplayer layer through one React component.

## CONTEXT

- App: `apps/web` (TanStack Start, React 19, Vite 8, Tailwind 4). SSR is on; camera/MediaPipe code
  must run client-side only (`ssr: false` on your route, dynamic imports in `useEffect`).
- You need **no Convex and no Phaser**. You need a working `apps/web/.env` with the team's
  `VITE_CONVEX_URL` only so the app boots (ask the MULTIPLAYER dev for it).
- Develop on desktop webcam at `http://localhost:3001/debug/vision` (localhost is a secure context).
  Test on a phone through an HTTPS tunnel (`cloudflared tunnel --url http://localhost:3001`) —
  iOS Safari refuses `getUserMedia` over plain http on a LAN IP.
- Library: `@mediapipe/tasks-vision` (PoseLandmarker, 33 landmarks). The tech lead installs it on
  `main` right after handoff; if it's missing run `cd apps/web && bun add @mediapipe/tasks-vision`
  and commit `package.json` + `bun.lock` alone.

## OWNED DIRECTORIES

```
apps/web/src/features/vision/**
apps/web/src/routes/debug/vision.tsx
apps/web/public/models/**              (optional: self-hosted .task model)
```

Suggested layout:

```
apps/web/src/features/vision/
  index.ts                 ← PUBLIC API: export { CaptureScreen } and types. Nothing else is imported by others
  CaptureScreen.tsx        ← the component MULTIPLAYER mounts (countdown → capture → onCapture)
  useCamera.ts             ← getUserMedia, facingMode "user", permissions, cleanup
  usePoseLandmarker.ts     ← loads MediaPipe (WASM + model), runs detectForVideo per frame
  classify.ts              ← landmarks → PoseResult (pure function, unit-testable)
  geometry.ts              ← angles, distances, normalization helpers (pure)
  thresholds.ts            ← ALL tunable numbers live here
  snapshot.ts              ← <video> → canvas → JPEG Blob (mirrored, ≤ 720px wide, quality ~0.8)
  DebugOverlay.tsx         ← skeleton, landmark IDs, angles, predicted move, confidence, power
  fixtures.ts              ← canned landmark arrays for each move (for tests / no-camera dev)
```

## FILES IT MAY MODIFY

Only the paths above. If you need a type from the shared contract, import it:
`import type { PoseResult, CaptureOutput, Move } from "@posefighter/backend/convex/shared/contracts";`

## FILES IT MUST NOT MODIFY

- `packages/backend/**` (including `shared/contracts.ts`) — use the change process in AGENTS.md §6.4
- `apps/web/src/game/**`, `apps/web/src/features/multiplayer/**`, `apps/web/src/routes/room/**`,
  `apps/web/src/routes/index.tsx`, `apps/web/src/routes/__root.tsx`
- `packages/ui/**`, `apps/web/src/index.css`, `vite.config.ts`, `turbo.json`, root `package.json`
- `apps/web/src/env.ts` (generated), `routeTree.gen.ts` (generated)

## DEPENDENCIES

- `@mediapipe/tasks-vision` (runtime). WASM via
  `FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@<installed-version>/wasm")`.
  Model: `pose_landmarker_lite.task` from Google's model storage
  (`https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`).
  If CDN latency hurts the demo, copy the `.task` file into `apps/web/public/models/` and load from `/models/...`.
- Use `runningMode: "VIDEO"`, `numPoses: 1`, delegate `"GPU"` with fallback to `"CPU"` on error.
- No other new dependencies.

## POSE DEFINITIONS (initial — tune during calibration, keep every number in `thresholds.ts`)

MediaPipe landmark indices: 0 nose · 11/12 shoulders · 13/14 elbows · 15/16 wrists · 23/24 hips.
Normalize all distances by shoulder width (|11−12|) so the rules are distance-independent.
Use `x` mirrored (front camera) consistently; left/right of the *player* does not matter for the rules below.

| Move | Rule of thumb | Signals |
|---|---|---|
| **SPECIAL** | both hands above head | both wrists.y < nose.y (screen y grows downward) |
| **BLOCK** | arms crossed / guard in front of chest | both wrists between shoulders horizontally, at chest height (between shoulder.y and hip.y), wrist-to-wrist distance < 0.8 shoulder widths |
| **DODGE** | torso leaning strongly left or right | angle of shoulder-center → hip-center vs vertical > ~20° OR shoulder-center.x offset from hip-center.x > 0.5 shoulder widths |
| **HEAVY_ATTACK** | wide aggressive stance + one arm extended | one arm extended (elbow angle > 150°) AND the other arm also away from torso / stance wide (hip-to-hip normalized or knee spread if visible) |
| **PUNCH** | one arm strongly extended forward/sideways | exactly one arm with elbow angle > 150° and wrist far from shoulder (> 1.2 shoulder widths); other arm not extended |

Evaluate in priority order **SPECIAL → BLOCK → DODGE → HEAVY_ATTACK → PUNCH**, then fallback.
If nothing matches, return the best partial match with low confidence; never throw.

Fallback when no person/too few landmarks visible (average `visibility` < 0.5): `move: "BLOCK"`,
`confidence: 0.2`, `power: 30` and show "Step back so we can see your arms" in the UI.

### confidence (0..1)
How far past the threshold the winning rule is, minus how close the runner-up is. Clamp to [0, 1].
Below 0.5, the capture screen shows a **RETRY** option (only if the round timer allows; MULTIPLAYER
decides — expose the value, don't block).

### power (0..100)
Pose quality, e.g. weighted mix of `extension` (arm straightness / reach), `balance` (hips level,
feet visible), `speed` (wrist velocity over the last ~300 ms before the snapshot). Power is meant to
be **a small modifier**: a good pose gives ×1.15 damage, a lazy one ×0.85. Fill `metrics` for debug.

Smooth over the last N frames (e.g. majority vote over 5 frames) before locking the move at the
end of the countdown to avoid single-frame jitter.

## INPUTS

- Live `<video>` from `getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false })`.
- Countdown length (`countdownSeconds`, default `COUNTDOWN_SECONDS = 3`).
- `debug` flag.

## OUTPUTS

`onCapture(output: CaptureOutput)` called **exactly once** per mount after the countdown reaches 0:

```ts
interface CaptureOutput {
  pose: PoseResult;   // { move, confidence, power, metrics? }
  photo: Blob;        // image/jpeg, mirrored like the preview, ≤ 720px wide, ~100–250 KB
}
```

## PoseResult CONTRACT

```ts
type Move = "PUNCH" | "BLOCK" | "DODGE" | "HEAVY_ATTACK" | "SPECIAL";
interface PoseResult {
  move: Move;
  confidence: number;   // 0..1
  power: number;        // 0..100
  metrics?: { extension?: number; balance?: number; speed?: number };
}
```
Canonical source: `packages/backend/convex/shared/contracts.ts`. Do not redeclare it locally.

## PUBLIC COMPONENT CONTRACT (what MULTIPLAYER will mount)

```tsx
import { CaptureScreen } from "@/features/vision";

<CaptureScreen
  onCapture={(output) => { /* upload photo, submit move */ }}
  countdownSeconds={3}
  debug={false}
  // optional nice-to-haves:
  // onReady={() => {}}   camera + model loaded
  // onError={(msg) => {}}
/>
```

Behaviour: full-screen portrait camera preview (mirrored) → "GET READY" until model is loaded →
big countdown 3·2·1 → "POSE!" flash → snapshot + classify → brief "MOVE LOCKED ✓  PUNCH · POWER 87"
→ `onCapture`. Camera track stopped on unmount. Component must be mountable again for the next round
(cache the PoseLandmarker instance in a module-level singleton so round 2 doesn't reload the model).

## IMPLEMENTATION PLAN (≈75 min)

1. **(10 min)** `routes/debug/vision.tsx` with `ssr: false`; `useCamera` shows mirrored video full-screen on desktop.
2. **(15 min)** `usePoseLandmarker`: dynamic import, load WASM + lite model, `detectForVideo` loop with
   `requestAnimationFrame`, draw skeleton on an overlay canvas. Verify FPS on desktop (> 15 fps target).
3. **(15 min)** `geometry.ts` + `classify.ts` + `thresholds.ts`: implement the five rules; overlay shows
   predicted move + confidence + power live. Tune thresholds with your own body.
4. **(10 min)** `snapshot.ts` + countdown + `onCapture` flow in `CaptureScreen.tsx`; export from `index.ts`.
5. **(10 min)** Phone test via tunnel: permissions prompt, `playsInline`, orientation, performance. Fall back to
   CPU delegate / lower resolution if GPU fails.
6. **(15 min)** Debug polish, fixtures, edge cases (no person, two people, camera denied → clear message + retry button).

Tell the team in chat the moment step 4 is exported — MULTIPLAYER integrates from that point.

## DEBUG MODE REQUIREMENTS (`/debug/vision` and `debug` prop)

Toggleable overlay showing: skeleton lines · landmark dots · landmark IDs · elbow angles (13/14) ·
torso lean angle · wrist-nose / wrist-wrist normalized distances · visibility average · predicted move ·
confidence · power · FPS · delegate (GPU/CPU). Plus buttons: "Capture now", "Copy landmarks JSON"
(to build fixtures), and a threshold panel (sliders or number inputs writing to a runtime copy of
`thresholds.ts`) so calibration doesn't need a reload.

## MOBILE REQUIREMENTS

- Portrait-first, `100dvh`, `object-fit: cover` video, mirrored via `transform: scaleX(-1)`.
- `<video autoPlay playsInline muted>`; call `.play()` after a user gesture if autoplay fails.
- Stop all tracks on unmount; handle `visibilitychange` (tab hidden → pause detection).
- HTTPS is mandatory on phones. Camera denied → friendly screen with instructions and a retry.
- Keep detection at ≤ 640px input; the lite model on GPU delegate should give ~20–30 fps on modern phones.
- `touch-action: none` on the capture screen to avoid pull-to-refresh.

## ACCEPTANCE TESTS

- [ ] `/debug/vision` opens on desktop and shows the mirrored camera with a live skeleton.
- [ ] Each of the 5 poses is recognized within 1 s and holds steady (no flicker) for one person standing 1.5–2.5 m away.
- [ ] `confidence` is noticeably lower for ambiguous poses; `power` is higher for fully extended limbs.
- [ ] No person in frame → fallback result + on-screen hint, no crash.
- [ ] `CaptureScreen` mounted → countdown → `onCapture` fires exactly once with a JPEG Blob under 300 KB.
- [ ] Unmount stops the camera (the browser camera indicator turns off).
- [ ] Works on iPhone Safari and Android Chrome over HTTPS; model load < 5 s on second mount (cached).
- [ ] `bun run check-types` passes.

## INTEGRATION INSTRUCTIONS

- Export **only** `CaptureScreen` (and its props type) from `apps/web/src/features/vision/index.ts`.
- MULTIPLAYER will mount it inside `/room/$code` when the room enters the "CHOOSE YOUR MOVE" phase and
  will handle upload + submission. You do not call Convex.
- For integration testing before MULTIPLAYER is ready, `/debug/vision` should show the last
  `CaptureOutput` (photo thumbnail + JSON).
- If you need to change `PoseResult`, follow AGENTS.md §6.4.

## STRETCH GOALS (after MVP only)

- Secret pose "THUNDER GOD" (e.g. one arm up, one arm down, wide stance) → extra `Move` value (needs contract change).
- Per-move power formulas (speed for PUNCH, stability for BLOCK).
- Multi-person detection for co-op boss mode (`numPoses: 2`).
- Self-hosted model file for offline demo resilience.
- Camera flip (rear/front) toggle.
