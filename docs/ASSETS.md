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
| `fighters/boxer/sheet.png` | OpenGameArt "Boxer Game Character" | Raga2D | https://opengameart.org/content/boxer-game-character | CC0 1.0 (stated in the page license box) | idle 0-9 · jab 10-17 · uppercut 18-25 · block 26-35 · hurt 36-43 · KO 44-51 (52 frames, 12 per row) | PNG spritesheet, uniform cells | 256×256 (source 744×711 PNG frames, scaled 0.357) | Cartoon chibi style, **art faces LEFT** → `facing: "left"` in `characters/boxer.ts`. Packed by `/tmp/pf-assets/pack.py` (union bbox crop, bottom-center). No dodge/special frames — presentation fallback. 1.0 MB |
| `fighters/samurai/sheet.png` | OpenGameArt "Samurai Character" | Segel | https://opengameart.org/content/samurai-character | CC0 1.0 (stated in the page license box) | idle 0-9 · quick slash (NoEffect1) 10-17 · heavy slash (Attack2) 18-25 · back-off 26-35 · hurt 36-41 · dead 42-49 (50 frames) | PNG spritesheet, uniform cells | 256×256 (source ≈595×483 PNG frames, per-frame bbox, scaled 0.448) | Same chibi style as the boxer, **art faces LEFT**. Back-off frames reused as DODGE. No block frames → idle + shield VFX. 0.9 MB |
| `fighters/wizard/sheet.png` | OpenGameArt "wizard character (animated)" (magician_v1.0.zip) | ruberboy | https://opengameart.org/content/wizard-characteranimated | CC0 1.0 ("public domain", stated on page) | idle 0-12 (every 2nd of 25) · cast 13-25 · damage 26-38 · die 39-51 (every 3rd of 37) | PNG spritesheet, uniform cells | 256×256 (source 299×463 … 546×559 DragonBones exports, per-frame bbox, scaled 0.479) | Hand-painted style, **art faces RIGHT**. Cast anim reused for ARCANE BOLT / METEOR / FIREBALL with different projectiles. 0.9 MB |
| `vfx/explosion.png` | OpenGameArt "Explosion" (explosion1_6.png) | BenHickling | https://opengameart.org/content/explosion-7 | CC0 1.0 | 50-frame explosion, 10×5 grid | PNG spritesheet | 100×100 | Key `explosion`, anim `vfx-explosion` @ 80 fps, ADD blend. 51 KB |
| `vfx/*` (particles, orb, fireball, meteor, wave, shield) | runtime-generated (`vfx/effects.ts → generateRuntimeTextures`) | — | — | n/a (code) | circle / ring / arc textures tinted per fighter palette | Phaser `make.graphics().generateTexture` | 16–256 | No files. |
| `audio/punch.{ogg,m4a}` | Kenney "Impact Sounds" (impactPunch_medium_000) | Kenney | https://kenney.nl/assets/impact-sounds | CC0 1.0 (License.txt in zip: "free to use in personal, educational and commercial projects") | punch impact | OGG + AAC/M4A (Safari) | — | m4a made with `afconvert` from the CC0 ogg. 8 KB / 5 KB |
| `audio/heavy.{ogg,m4a}` | Kenney Impact Sounds (impactPunch_heavy_000) | Kenney | same | CC0 1.0 | heavy impact | OGG + M4A | — | 11 KB / 7 KB |
| `audio/block.{ogg,m4a}` | Kenney Impact Sounds (impactMetal_medium_000) | Kenney | same | CC0 1.0 | block clank | OGG + M4A | — | 6 KB / 5 KB |
| `audio/dodge.{ogg,m4a}` | Kenney Impact Sounds (impactSoft_medium_000) | Kenney | same | CC0 1.0 | dodge swoosh | OGG + M4A | — | 5 KB / 4 KB |
| `audio/whoosh.{ogg,m4a}` | Kenney Impact Sounds (impactSoft_heavy_000) | Kenney | same | CC0 1.0 | attack start | OGG + M4A | — | 6 KB / 5 KB |
| `audio/fireball.{ogg,m4a}` | Kenney Impact Sounds (impactGlass_light_000) | Kenney | same | CC0 1.0 | cast | OGG + M4A | — | 6 KB / 4 KB |
| `audio/explosion.{ogg,m4a}` | Kenney Impact Sounds (impactPlate_heavy_000) | Kenney | same | CC0 1.0 | explosion | OGG + M4A | — | 9 KB / 6 KB |
| `audio/ko.{ogg,m4a}` | Kenney Impact Sounds (impactBell_heavy_000) | Kenney | same | CC0 1.0 | KO gong | OGG + M4A | — | 13 KB / 7 KB |
| `audio/sting.{ogg,m4a}` | Kenney Impact Sounds (impactTin_medium_000) | Kenney | same | CC0 1.0 | banner sting | OGG + M4A | — | 6 KB / 4 KB |
| `arenas/` | runtime-generated (`FightScene.drawArena`) | — | — | n/a (code) | gradient sky, neon horizon, perspective floor grid, ember particles | Phaser graphics | — | No files yet; a PNG background can be added later. |
| font: Bangers | Google Fonts | Vernon Adams | https://fonts.google.com/specimen/Bangers | SIL Open Font License 1.1 | arcade display font | webfont via `<link>` injected by `FightPlayer` | — | Falls back to Impact / Arial Black after 1.5 s. |

**Total committed: ≈3.1 MB** (`du -sh apps/web/public/assets`).

### Evaluated and rejected

| Candidate | Why not |
|---|---|
| CraftPix "Free Samurai / Warrior Pixel Art Sprite Sheets" | CraftPix freebies have their own license (no redistribution of source files, attribution rules) — not CC0/CC-BY; skipped to stay unambiguous. |
| OpenGameArt "Pixel Samurai SpriteSheet" (cyanglaz, CC-BY 4.0) | Only idle/attack/block, no hurt/death, 6 KB tiny pixel sprite — style mismatch with the other two. |
| OpenGameArt "Samurai Sprites" (sebshady, CC0) | Top-down 48×48 RPG walk/attack cycles; not a side-view fighter. |
| itch.io LuizMelo-style packs | Downloads sit behind itch's interstitial; license wording per page varies — no time to verify each. |

## Validation checklist (GAME dev — do this before writing the renderer)

- [x] Found idle + attack + hit + ko for **each** of BOXER / SAMURAI / WIZARD. Missing slots (boxer dodge/special, samurai block/special, wizard block/dodge) use the presentation fallbacks in `entities/FighterActor.ts`.
- [x] License for each confirmed and recorded above (all CC0 + OFL font).
- [x] Frame dimensions recorded; every sheet is uniform 256×256 cells, 12 per row.
- [x] Facing direction noted: boxer + samurai face LEFT, wizard faces RIGHT → `assets.facing` in each `CharacterDefinition`; `FighterActor` flips so P1 always faces right.
- [x] Ground/foot offset: frames are bottom-aligned in their cell at pack time, `originY: 1` for all three.
- [x] Total asset size ≈ 3.1 MB < 10 MB.
- [x] Credits list drafted (all CC0 — attribution optional, given anyway).

## Credits (CC-BY / attribution required)

All art and audio is CC0; attribution is voluntary but appreciated:

- Boxer sprites by Raga2D — CC0 — https://opengameart.org/content/boxer-game-character
- Samurai sprites by Segel — CC0 — https://opengameart.org/content/samurai-character
- Wizard sprites by ruberboy — CC0 — https://opengameart.org/content/wizard-characteranimated
- Explosion spritesheet by BenHickling — CC0 — https://opengameart.org/content/explosion-7
- Impact Sounds by Kenney — CC0 — https://kenney.nl/assets/impact-sounds
- Bangers font by Vernon Adams — SIL OFL 1.1 — https://fonts.google.com/specimen/Bangers
