# best-game-entry

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bahrizal/best-game-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bahrizal/best-game-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Neon Tide — a neon arena-survival roguelite: pilot a lone vessel through 10 waves of void creatures, collect shards, level up and choose upgrades, and break the Warden. Vanilla JavaScript and canvas, no libraries, no network.

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=r74f371w&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## The game

You are the last light in a dark arena. Void creatures pour in, wave after wave —
motes that chase, weavers that drift in sine curves, splitters that burst into three,
spitters that shoot back, and at wave 10, the Warden itself.

- **Move:** WASD or arrow keys. **Aim:** mouse — fire is automatic.
- **Collect shards** from fallen enemies to fill the XP bar. Each level up pauses
  the tide and offers three upgrades: heavier rounds, split shot, piercing rounds,
  faster fire, hull plating, a tractor field, thrusters, or an Aegis shield.
- **Win** by breaking the Warden on wave 10. **Lose** when your hull hits zero.
- **P** pauses, **M** mutes, **R** restarts. Your best score is kept in the browser.

## Files

| file | what it does |
| --- | --- |
| `game/index.html` | The page: a full-window canvas and a status line. |
| `game/src/config.js` | Every number the game runs on: field, player, enemies, waves. |
| `game/src/random.js` | A seeded random source, so a seed replays the same game. |
| `game/src/audio.js` | All sound, synthesized with WebAudio — no audio files. |
| `game/src/input.js` | Keyboard and mouse, read once a frame. |
| `game/src/entities.js` | The player, bullets, enemies, shards, particles, floaters. |
| `game/src/upgrades.js` | The eight level-up upgrades and how they stack. |
| `game/src/world.js` | The state machine, the wave director, XP and score. |
| `game/src/render.js` | The arena, the ships, the HUD and the five screens. |
| `game/src/shots.js` | The screenshot scenes: real games played by an autopilot. |
| `game/src/main.js` | Boot and the one loop; `?shot=` stages a scene, `?seed=` fixes it. |
| `main.ts` | Hands the game in: copies game/ and screenshots/ to /output. |
| `serve.ts` | Dev server for local play. |

## License

MIT — see `LICENSE`.
