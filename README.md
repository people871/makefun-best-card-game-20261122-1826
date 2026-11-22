# EMBER COURT — 52-card deck, 3 lanes, 12 rounds, 4 suit powers, greedy Duchess AI, synergy + pair combos — three-lane card battler, offline

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/people871/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/people871/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**EMBER COURT** is an original three-lane card battler built for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826). You and the Duchess each draw from your own shuffled 52-card deck. Every round you play cards into three lanes, paying mana; she answers with a greedy lane evaluation that flips losing lanes first; then every lane resolves and the stronger lane deals the difference as damage to the other court's life. Both courts start at 30 life. Reduce the Duchess to 0 — or lead on life after 12 rounds.

## What is in the game

- **52-card deck, 3 lanes, 12 rounds** — one card per rank 2–Ace in each of four suits, per side. Cost 1–5 by rank band, power = rank (Ace hits for 14).
- **4 suit powers, always visible on the card** — ♠ Spades +2 lane power, ♥ Hearts heal 2 life, ♦ Diamonds draw 1 card, ♣ Clubs +1 mana.
- **Synergy + pair combos** — same suit already in a lane: SYNERGY +3; same rank: PAIR +4. They stack, and the bonus is printed on the card.
- **A Duchess who actually thinks** — greedy AI: for every affordable card and lane she scores the damage swing, flips losing lanes first, heals when hurt, and stops when no move is worth its mana. Ties break on the seeded stream, never on Math.random.
- **Mana that grows** — 3 mana in round 1, +1 a round to 10. Draw 2 a round, hand cap 7.
- **Complete game** — title screen with the rules, a live table (both hands, both life bars, mana, score, deck counts, lane powers), win screen and loss screen with a full score breakdown, pause, restart, best score in localStorage.
- **Synthesised sound only** — play, draw, damage, heal, win and loss phrases from WebAudio oscillators. No audio files. M to mute.
- **Deterministic** — `?seed=N` fixes every shuffle and AI tie-break; two runs of `main.ts` write identical bytes.

## How to run it (offline, no build step)

```sh
node serve.ts
# open http://localhost:8080 — click a card, then click a lane to play it
# keys 1-7 select a card · Space ends the turn · R restarts · P pauses
# L for the title · M mutes · ?selftest=1 runs the 27 scripted checks
```

## File map

- `game/index.html` — canvas page, no external requests
- `game/src/config.js` — all tuning numbers (costs, suit powers, synergy, life, mana)
- `game/src/random.js` — seeded RNG (mulberry32) + shuffle
- `game/src/deck.js` — the 52-card deck builder
- `game/src/world.js` — rules: play, suit effects, AI, lane resolution, win/loss
- `game/src/render.js` — the painter: table, lanes, hands, HUD, title/win/loss screens
- `game/src/input.js` — keyboard + mouse, actions handed over once
- `game/src/audio.js` — WebAudio synth, no files
- `game/src/shots.js` — staged screenshots (play / title / win / loss)
- `game/src/selftest.js` — 27 scripted checks against the real rules
- `game/src/main.js` — boot, fixed-step loop, screen state machine
- `main.ts` — hand-in program: copies game/ + screenshots/ to /output, writes dossier.json
- `serve.ts` — tiny local static server for play-testing
