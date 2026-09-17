# POSE FIGHT — Game Design (hackathon rules)

Simple, deterministic, explainable in one breath: **"It's rock-paper-scissors with your body, and a good pose hits a bit harder."**

## Core rules

- Online 1v1. Each player on their own phone. Both start with **100 HP**.
- Every round both players secretly choose one of five moves **by striking a pose**.
- Moves are revealed together. Convex resolves the round with the table below. HP updates.
- First to reach **0 HP loses**. No round limit (a battle lasts ~4–7 rounds ≈ 3 minutes).

## Moves (identical for every fighter)

| Move | Pose | Role | Base damage |
|---|---|---|---|
| **PUNCH** | one arm strongly extended | reliable attack | 15 |
| **BLOCK** | arms crossed / guard in front of chest | reduces normal attacks | 0 |
| **DODGE** | torso leaning hard left or right | avoids heavy attacks | 0 |
| **HEAVY_ATTACK** | wide aggressive stance + extended arm | big damage, punishes BLOCK | 25 |
| **SPECIAL** | both hands above head | biggest damage, punishes DODGE | 30 |

## Interaction table (attacker's move → defender's move → % of attacker's base damage dealt)

| Attack ↓ / Defense → | vs BLOCK | vs DODGE |
|---|---|---|
| PUNCH | **20 %** (chip, 3) → `BLOCKED` | **50 %** (7) → `DODGED` |
| HEAVY_ATTACK | **100 %** (block broken, 25) → `P?_HIT` | **0 %** → `DODGED` |
| SPECIAL | **50 %** (15) → `BLOCKED` | **100 %** (30) → `P?_HIT` |

Attack vs attack:
- **Different attacks:** both land at 100 % → `DOUBLE_HIT`.
- **Same attack:** `CLASH` → both take **50 %** of that move's base.
- **BLOCK vs BLOCK, DODGE vs DODGE, BLOCK vs DODGE:** `STALEMATE`, no damage.

Cheat sheet for players: **BLOCK beats PUNCH · DODGE beats HEAVY · HEAVY beats BLOCK · SPECIAL beats DODGE · PUNCH is safe damage.**

## Power modifier (pose quality)

`power` is 0–100 from the vision system. It scales damage slightly, never strategy:

```
multiplier = 0.85 + 0.30 * (power / 100)          // 0.85 … 1.15
damage     = round(baseDamage * interaction% * multiplier)
```
A perfect SPECIAL does 35; a lazy one 26. Chip damage from a blocked PUNCH stays ~3 either way.
Defensive moves have no damage; their `power` is shown as **DEFENSE** on the reveal for flavor only.

## Outcome derivation (what Convex writes into `CombatResult.outcome`)

1. Compute damage to each player with the table.
2. If any `hpAfter === 0` → `KO`, set `winnerPlayerId`. If **both** hit 0: higher `hpAfter` before clamping wins;
   if equal, higher `power` wins; if still equal, player1 (host) wins. Deterministic, no randomness anywhere.
3. Else if both defensive → `STALEMATE`.
4. Else if both attacked: same move → `CLASH`, otherwise `DOUBLE_HIT`.
5. Else (one attack, one defense): defender used BLOCK and interaction < 100 % → `BLOCKED`; defender used DODGE and
   interaction < 100 % → `DODGED`; interaction 100 % → `P1_HIT` or `P2_HIT` (whoever **took** damage).

## Round lifecycle

```
CHOOSE YOUR MOVE  →  3·2·1 POSE!  →  📸  →  MOVE LOCKED ✓  →  (wait)  →  REVEAL  →  3·2·1 FIGHT!  →  CINEMATIC  →  HP  →  next round / KO
```
- Both players pose at the same time on their own phones; nobody sees the other's move until both are locked.
- **Reveal screen:** both real photos side by side, nickname above, move name below (with the fighter's flavor name,
  e.g. WIZARD SPECIAL → "FIREBALL"), and POWER / DEFENSE number. Hold ~2 s, then 3·2·1 FIGHT!
- **Cinematic:** 6–10 s Phaser playback of the resolved round. Both phones show the same thing.
- **KO:** slow-mo final hit, "K.O.!", winner pose, winner screen with both final photos. Rematch or new room.

## Fighter archetypes (presentation only — same rules for all)

| | BOXER | SAMURAI | WIZARD |
|---|---|---|---|
| Vibe | street arcade, red/gold | anime steel, blue/white | neon arcane, purple/green |
| PUNCH | Jab | Quick Slash | Arcane Bolt |
| BLOCK | Guard Up | Parry | Mana Ward |
| DODGE | Sway | Sidestep | Blink |
| HEAVY_ATTACK | Haymaker | Heavy Cleave | Meteor |
| SPECIAL | **Power Punch** | **Energy Slash** | **Fireball** |

Internally every move is the canonical `Move`; names above live in `CharacterDefinition.moveNames`.

## Visual language

- Anime/arcade: condensed uppercase italics, thick strokes, neon glow, high contrast on dark backgrounds.
- Big VS card in the lobby. Huge room code. Chunky health bars with nickname + fighter.
- Reveal celebrates the **ridiculous real photo**; the fight celebrates the **epic animation**. The contrast is the joke.
- Every hit: flash + shake + hit stop + particles + damage number + sound.

## Powers (flavor for SPECIAL/HEAVY effects)

Boxer: raw force, ground cracks, impact rings. Samurai: energy blades, slash arcs, speed lines. Wizard: projectiles,
runes, explosions. These are VFX choices only.

## Future: Boss mode (STRETCH — do not build before MVP)

**THE VOID KING**: 2–4 humans in one room vs a scripted boss with 300+ HP. Each round the boss picks a move by a fixed
pattern (telegraphed the round before, e.g. "THE VOID KING raises both arms…"). Humans pose simultaneously; team combos
apply: PUNCH+PUNCH → DOUBLE STRIKE (+25 %), BLOCK+PUNCH → COUNTER ASSAULT (block negates boss attack, punch lands ×1.5),
SPECIAL+SPECIAL → TWIN DRAGON (×2). Requires new room mode, resolver branch and a boss `CharacterDefinition`.

## Other stretch ideas
Secret pose "THUNDER GOD" (hidden 6th move, 40 dmg, beaten by BLOCK), round timer with auto-BLOCK, spectator screen for
the audience, round recap, shareable battle card, more arenas/fighters.
