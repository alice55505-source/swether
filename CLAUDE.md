# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**營養切切樂 (Swether)** — A mobile-first HTML5 canvas food-slicing game with a nutrition education theme. Three levels: protein (Level 1), vegetables (Level 2), healthy starches (Level 3). Target audience is elderly users (長輩).

## Deployment

- **No build step.** All code is in `index.html` (single file). Deploy by pushing to `main`.
- **Hosting:** Cloudflare Pages, connected to GitHub `main` branch — every push to `main` triggers auto-deployment.
- **Assets** (`images/`, `sounds/`) are committed to the repo and served from Cloudflare's same origin (`BASE = './'`). Do **not** revert this to the old `raw.githubusercontent.com` URL.
- `gen_icons.py` is a one-off utility script — do not commit it as part of features.

## Architecture

Everything lives in `index.html` (~1,400 lines). There is no module system.

### Screen Flow
```
#home → (tap) → difficulty modal → #intro → #k1Screen → #gameContainer
       → (level end) → #betweenLevel → #gameContainer (next level)
       → (all 3 levels) → #result
```
`showScreen(id, bgKey)` switches the active `.screen` div and sets its CSS background image.

### Game Loop
- `requestAnimationFrame(updateLoop)` — single loop, guarded by `loopRunning` flag to prevent double-starts.
- Food items fall via `spawnFood()` on a `setInterval` (`spawnTimerId`). Level ends via `setTimeout` (`levelEndTimerId`) at 30 seconds.
- Canvas pointer events (unified touch + mouse) trigger slice detection.

### Audio — Two-Track System
iOS requires user-gesture-gated audio. The game handles this with two separate systems:
1. **SFX** (`actx` / Web Audio API) — low-latency, decoded into `sfxBuffers`. Initialised inside `grantSoundPermission()` which must run synchronously within a gesture handler.
2. **BGM + cheer** (`<audio>` tags, `bgmAudio` / `cheerAudio`) — HTML5 audio for iOS compatibility.

`soundPermissionGranted` flag gates all audio. Never call `actx.resume()` outside a gesture handler on iOS.

### Food Data
- `LEVEL_CORRECT[1|2|3]` — emoji arrays for each level's correct foods.
- `BAD_FOODS` — junk food emojis (double penalty: −20 pts).
- `WRONG_POOL[level]` — pre-built distractor pool (bad foods + other levels' correct foods).
- Difficulty `novice`: 40% wrong items, 1500 ms spawn; `expert`: 55% wrong, 1200 ms spawn.

### Scoring
- Correct slice: +50 pts
- Wrong healthy food: −10 pts
- Bad food: −20 pts
- Minimum score: 100 pts
- Cheer/ribbon effect every 200 pts

## PWA

| File | Purpose |
|------|---------|
| `manifest.json` | App metadata, icons, `display: standalone` |
| `sw.js` | Service worker — caching + offline |
| `icons/` | PNG icons (512, 192, 180 px); regenerate with `python3 gen_icons.py` |
| `.nojekyll` | Prevents GitHub Pages from running Jekyll |

### Service Worker Cache Strategy
- **Shell** (`swether-shell-v2`): `index.html`, manifest, icons → stale-while-revalidate
- **Assets** (`swether-assets-v2`): `images/*`, `sounds/*` → cache-first; pre-warmed in background on SW install

**When bumping the SW version** (e.g. after adding/removing assets), update both `SHELL_VER` and `ASSETS_VER` constants in `sw.js` so stale caches are evicted. The `activate` handler deletes any cache name not in `ALL_CACHES`.

### Install Prompt Logic (in `index.html`)
- Shows 300 ms after page load on **all** platforms.
- Android with `beforeinstallprompt`: native install button.
- Android without it: shows manual "⋮ menu" instructions.
- iOS: shows "Share → Add to Home Screen" instructions.
- Intentionally shows on every visit until the app is in `standalone` mode — **do not add localStorage suppression** (users are elderly and cannot clear cache).

### Update Toast
`#pwaUpdateToast` appears at the top when a new SW version is `installed` (not yet activated). Clicking it calls `location.reload()`.

## Key Constraints

- **iOS LINE WebView compatibility** — home screen uses `touchstart` + `click` double-binding with a debounce flag (`homeFired`). Do not simplify this.
- **Canvas resize** — only resize when dimensions actually change (`canvas.width !== window.innerWidth`), or the canvas context state is wiped mid-game.
- **`grantFired` flag** — prevents `grantSoundPermission()` from running twice (iOS fires both `onclick` and `ontouchstart`).
- **`FISH_KEY` / `VOICE_ID`** constants in `index.html` are legacy — unused but present; leave them.
