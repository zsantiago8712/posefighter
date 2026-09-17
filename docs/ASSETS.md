# POSE FIGHT — Assets

Owner: **GAME** workstream. Nobody downloads "random" assets. Every asset used in the repo has a row in the
inventory table below with a confirmed license. If the license is unclear, **do not use it**.

## Licensing requirements

Acceptable: **CC0 / public domain**, **CC-BY** (credit in `docs/ASSETS.md` + in-game credits screen if time),
**OGA-BY**, assets whose author explicitly states "free for personal and commercial use" on the download page
(screenshot/quote the statement in *Integration notes*), and MIT/Apache-licensed packs.
Not acceptable: CC-BY-NC (we may demo publicly / commercially later), CC-BY-SA for art we modify heavily,
sprites ripped from commercial games, anything without a stated license, AI-generated art of recognizable IP.

Sound: CC0 preferred (Kenney, freesound.org filtered by CC0, Mixkit free license is OK). Fonts: Google Fonts
(OFL) or system fonts only.

## Folder structure (already created with `.gitkeep`)

```
apps/web/public/assets/
  fighters/
    boxer/     sheet.png | atlas.png + atlas.json | portrait.png
    samurai/   ...
    wizard/    ...
  vfx/         hit-spark.png, explosion.png, slash.png, fireball.png, shield.png, ...
  audio/       whoosh.ogg, punch.ogg, heavy.ogg, block.ogg, dodge.ogg, fireball.ogg, explosion.ogg, ko.ogg, fight-loop.ogg
  arenas/      arena-01.png (+ optional parallax layers)
```
Served at `/assets/...`. Keep total under **10 MB**. Prefer PNG spritesheets with uniform frame sizes (Phaser
`spritesheet` loader) or TexturePacker JSON atlases. No single texture above 4096 px.

## Required fighter animations (per archetype — minimum set in bold)

| Key | Needed for | Fallback if missing |
|---|---|---|
| **idle** (loop) | always on screen | static frame + breathing tween |
| **attack** (once) | PUNCH, and reused for HEAVY_ATTACK/SPECIAL with different speed + VFX | scale/tween lunge |
| **hit** (once) | receiving damage | red tint + knockback tween |
| **ko / death** (once) | KO round | fall tween + rotate |
| block | BLOCK | idle + shield VFX |
| dodge / dash | DODGE | idle + alpha ghost trail |
| heavyAttack | HEAVY_ATTACK | attack at 0.7× frameRate + zoom |
| special | SPECIAL | attack + projectile + flash |
| victory | winner screen | idle + confetti |

A pack with idle/attack/hit/death per fighter is enough. Everything else is presentation layering.

## Required VFX

hit spark (small), heavy impact (large ring/burst), explosion (fireball impact), slash arc / energy wave
(samurai special projectile), fireball projectile, shield/ward shimmer (block), dodge afterimage (runtime alpha
ghosts — no asset), speed lines (runtime graphics), confetti (runtime particles), full-screen flash (runtime
rectangle). Particles use runtime-generated circle textures; no assets needed.

## Required sound

whoosh (attack start), punch impact, heavy impact, block clank/shield, dodge swoosh, fireball cast, explosion,
KO hit + crowd/gong, round banner sting ("FIGHT!"), optional 20–30 s fight loop, optional lobby loop. All < 100 KB,
OGG + MP3 fallback if trivial (Safari prefers MP3/AAC; Phaser picks the first supported).

## Where to look (candidates — verify license on the actual page before downloading)

- **Kenney.nl** — CC0 UI, particles, sound packs (impact sounds, UI audio). Safe default.
- **OpenGameArt.org** — filter by CC0 / CC-BY; many 2D fighter and effect sheets. Read each page's license box.
- **itch.io free asset packs** — search "fighter sprite", "samurai sprite", "wizard sprite", "martial hero", "pixel
  effects", "slash effect". Many authors (e.g. LuizMelo-style packs, "Free Pixel Effects", "Pixel Art Fighting
  Sprites") allow personal + commercial use; **confirm the wording on each page** and paste it into the table.
- **Google Fonts** — Bangers, Anton, Bebas Neue, Russo One, Black Ops One for arcade typography (OFL).
- **freesound.org** (CC0 filter), **Mixkit** (free license) for SFX.
- Model file for VISION (not an art asset, listed for completeness): MediaPipe `pose_landmarker_lite.task`, Apache-2.0.

## Inventory (fill one row per asset actually committed)

| Asset (path) | Source | Author | URL | License (exact) | Animations / contents | Format | Frame W×H | Integration notes |
|---|---|---|---|---|---|---|---|---|
| `fighters/boxer/…` | | | | | | | | |
| `fighters/samurai/…` | | | | | | | | |
| `fighters/wizard/…` | | | | | | | | |
| `vfx/…` | | | | | | | | |
| `audio/…` | | | | | | | | |
| `arenas/…` | | | | | | | | |
| font: | | | | | | | | |

## Validation checklist (GAME dev — do this before writing the renderer)

- [ ] Found idle + attack + hit + ko for **each** of BOXER / SAMURAI / WIZARD (or accepted placeholders for some).
- [ ] License for each confirmed and recorded above.
- [ ] Frame dimensions recorded; frames are uniform per sheet (or an atlas JSON exists).
- [ ] Facing direction noted (most packs face right; P2 is flipped with `setFlipX(true)`).
- [ ] Ground/foot offset noted so all three stand on the same line (`originY` in `CharacterDefinition`).
- [ ] Total asset size < 10 MB.
- [ ] Credits list drafted for CC-BY items.

## Credits (CC-BY / attribution required)

_(add lines like: "Hit sparks by <author> — CC-BY 4.0 — <url>")_
