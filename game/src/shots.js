// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame.
import { FIELD, STEP } from './config.js';
import { SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const UPGRADE_LIMIT_SECONDS = 150;
const SAMPLE = 1 / 30;

/** The nearest enemy, or null when the field is empty. */
function nearestEnemy(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function nearestShard(state) {
  let best = null;
  let bestD = Infinity;
  for (const s of state.shards) {
    const d = Math.hypot(s.x - state.player.x, s.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/**
 * Steer the ship: flee what is close, chase the nearest shard, drift to the centre
 * when there is nothing to do. Reckless mode does the opposite on purpose, so the
 * end scene really ends.
 */
function pilot(state, reckless) {
  const p = state.player;
  const enemy = nearestEnemy(state);
  const aim = enemy ? { x: enemy.x, y: enemy.y } : { x: FIELD.width / 2, y: FIELD.height / 2 };
  let mx = 0;
  let my = 0;
  if (reckless && enemy) {
    mx = enemy.x - p.x;
    my = enemy.y - p.y;
  } else {
    for (const e of state.enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 110) {
        const w = (110 - d) / 110;
        mx += (dx / d) * w;
        my += (dy / d) * w;
      }
    }
    for (const b of state.ebullets) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 90) {
        const w = (90 - d) / 90;
        mx += (dx / d) * w;
        my += (dy / d) * w;
      }
    }
    const shard = nearestShard(state);
    if (shard && Math.hypot(shard.x - p.x, shard.y - p.y) < 320) {
      mx += (shard.x - p.x) / 320;
      my += (shard.y - p.y) / 320;
    }
    mx += (FIELD.width / 2 - p.x) / 800;
    my += (FIELD.height / 2 - p.y) / 800;
  }
  const len = Math.hypot(mx, my);
  const move = len > 0.01 ? { x: mx / len, y: my / len } : { x: 0, y: 0 };
  return { move, aim };
}

/** Run the world forward; return the events of the last step and whether it ended. */
function drive(world, seconds, reckless, stopOnLevelup) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const { move, aim } = pilot(world.state, reckless);
    const events = world.step(STEP, move, aim, null, true);
    if (events & 2 && stopOnLevelup) return { events, over: false, leveled: true };
    if (events & 2) world.applyChoice(0);
    if (events & 4) return { events, over: true, leveled: false };
    if (events & 8) return { events, over: false, leveled: false };
  }
  return { events: 0, over: false, leveled: false };
}

/**
 * Set `world` to the named scene (start, play, upgrade or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0 }, { x: FIELD.width / 2, y: FIELD.height / 2 }, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.state.phase = 'playing';
  world.startWave(1);
  if (name === 'upgrade') {
    const run = drive(world, UPGRADE_LIMIT_SECONDS, false, true);
    return { screen: run.leveled ? SCREEN_LEVELUP : run.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    drive(world, END_LIMIT_SECONDS, true, false);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  const run = driveUntilBusy(world);
  return { screen: run.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}

/** Drive the play scene until the field is actually busy: past the banner, at
 * least 12 s in, 8 or more enemies live (cap 120 s). A fixed timer alone kept
 * landing on wave banners with an empty field. */
function driveUntilBusy(world) {
  let elapsed = 0;
  while (elapsed < 120) {
    const { move, aim } = pilot(world.state, false);
    const events = world.step(STEP, move, aim, null, true);
    elapsed += STEP;
    if (events & 2) world.applyChoice(0);
    if (events & 4) return { over: true };
    if (events & 8) return { over: false };
    if (elapsed > 12 && world.state.enemies.length >= 8 && world.state.waveState !== 'banner') {
      return { over: false };
    }
  }
  return { over: false };
}
