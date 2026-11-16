// The world: one state object, the wave director, and the step that advances it.
// Phases: title (ambient drift), playing, levelup (frozen while the player picks),
// over, win. step() returns an event bitmask the loop reads.
import { ENEMY, FIELD, SCORE, WAVES_TOTAL, waveComp, waveInterval, xpNeed } from './config.js';
import { createPlayer, hurtPlayer, spawnBoss, spawnEnemy, updateBullets, updateEnemies, updateEnemyBullets, updateFloaters, updateParticles, updatePlayer, updateShards } from './entities.js';
import { applyUpgrade, rollChoices } from './upgrades.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_LEVELUP = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_WAVE = 16;

export function createWorld(rng) {
  const state = {
    rng,
    player: createPlayer(),
    bullets: [],
    enemies: [],
    ebullets: [],
    shards: [],
    particles: [],
    floaters: [],
    stars: [],
    wave: 0,
    waveState: 'banner',
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    score: 0,
    kills: 0,
    xp: 0,
    level: 1,
    time: 0,
    phase: 'title',
    shake: 0,
    flash: 0,
    banner: '',
    bannerTimer: 0,
    choices: [],
    boss: null,
  };
  for (let i = 0; i < 90; i += 1) {
    state.stars.push({
      x: rng.range(0, FIELD.width),
      y: rng.range(0, FIELD.height),
      size: rng.range(0.6, 2),
      tw: rng.range(0, Math.PI * 2),
      speed: rng.range(4, 14),
    });
  }
  return { state, reset, step, startWave, applyChoice };

  function reset() {
    state.player = createPlayer();
    state.bullets = [];
    state.enemies = [];
    state.ebullets = [];
    state.shards = [];
    state.particles = [];
    state.floaters = [];
    state.wave = 0;
    state.waveState = 'banner';
    state.waveTimer = 0;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.score = 0;
    state.kills = 0;
    state.xp = 0;
    state.level = 1;
    state.time = 0;
    state.phase = 'title';
    state.shake = 0;
    state.flash = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.choices = [];
    state.boss = null;
  }

  function buildQueue(n) {
    const comp = waveComp(n);
    const queue = [];
    for (const [type, count] of Object.entries(comp)) {
      for (let i = 0; i < count; i += 1) queue.push(type);
    }
    // Shuffle, but keep the boss last.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (comp.warden) {
      const at = queue.indexOf('warden');
      queue.splice(at, 1);
      queue.push('warden');
    }
    return queue;
  }

  function startWave(n) {
    state.wave = n;
    state.waveState = 'banner';
    state.waveTimer = 2.2;
    state.spawnQueue = buildQueue(n);
    state.spawnTimer = 0;
    state.banner = n === WAVES_TOTAL ? 'FINAL WAVE — THE WARDEN' : `WAVE ${n}`;
    state.bannerTimer = 2.2;
  }

  function applyChoice(index) {
    const def = state.choices[index];
    if (!def) return;
    applyUpgrade(state.player, def.id);
    state.choices = [];
    state.phase = 'playing';
  }

  function levelUpCheck(audio) {
    let leveled = false;
    while (state.xp >= xpNeed(state.level)) {
      state.xp -= xpNeed(state.level);
      state.level += 1;
      leveled = true;
    }
    if (leveled) {
      state.choices = rollChoices(state.rng, state.player.upgrades);
      state.phase = 'levelup';
      if (audio) audio.levelup();
      return true;
    }
    return false;
  }

  function step(dt, move, aim, audio, demo) {
    // Ambient drift runs on every screen: stars, particles, floaters.
    for (const s of state.stars) {
      s.y += s.speed * dt;
      s.tw += dt * 2;
      if (s.y > FIELD.height + 2) {
        s.y = -2;
        s.x = state.rng.range(0, FIELD.width);
      }
    }
    updateParticles(state, dt);
    updateFloaters(state, dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;

    if (state.phase === 'title') {
      // A few motes wander behind the title so the menu feels alive.
      if (state.enemies.length < 6 && state.rng.chance(dt * 0.5)) {
        spawnEnemy(state, state.rng.pick(['mote', 'weaver']), undefined, undefined);
      }
      for (const e of state.enemies) {
        e.t += dt;
        e.x += Math.cos(e.t) * 20 * dt;
        e.y += Math.sin(e.t * 1.3) * 20 * dt;
      }
      return EVENT_NONE;
    }
    if (state.phase === 'levelup' || state.phase === 'over' || state.phase === 'win') return EVENT_NONE;

    state.time += dt;
    const hpBefore = state.player.hp;
    updatePlayer(state, move, aim, dt, audio);
    updateBullets(state, dt, audio);
    updateEnemies(state, dt, audio);
    updateEnemyBullets(state, dt, audio);
    updateShards(state, dt, audio);

    if (state.player.hp <= 0) {
      state.phase = 'over';
      state.score += state.wave * SCORE.waveClear;
      return EVENT_OVER;
    }
    let events = state.player.hp < hpBefore ? EVENT_HIT : EVENT_NONE;

    if (levelUpCheck(audio)) return events | EVENT_LEVELUP;

    // The wave director: banner, then trickle the queue, then wait for the field to clear.
    if (state.waveState === 'banner') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        state.waveState = 'spawning';
        state.spawnTimer = 0;
        // Open the wave with a burst so the field fills at once.
        for (let i = 0; i < 3 && state.spawnQueue.length > 0; i += 1) {
          const type = state.spawnQueue.shift();
          if (type === 'warden') state.boss = spawnBoss(state);
          else spawnEnemy(state, type);
        }
        if (state.wave === WAVES_TOTAL && audio) audio.boss();
        else if (audio) audio.horn();
      }
    } else if (state.waveState === 'spawning') {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
        state.spawnTimer = waveInterval(state.wave);
        const type = state.spawnQueue.shift();
        if (type === 'warden') state.boss = spawnBoss(state);
        else spawnEnemy(state, type);
      }
      if (state.spawnQueue.length === 0) state.waveState = 'fighting';
    } else if (state.waveState === 'fighting' && state.enemies.length === 0) {
      state.score += SCORE.waveClear;
      events |= EVENT_WAVE;
      if (state.wave >= WAVES_TOTAL) {
        state.phase = 'win';
        state.score += SCORE.winBonus + Math.round(state.player.hp) * 2;
        if (audio) audio.win();
        return events | EVENT_WIN;
      }
      startWave(state.wave + 1);
    }
    if (state.boss && state.boss.hp <= 0) state.boss = null;
    return events;
  }
}
