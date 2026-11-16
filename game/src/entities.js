// Everything that moves: the player ship, bullets, enemies, enemy orbs, XP shards,
// particles and floating damage numbers. Each factory makes one, each updater moves
// one kind for a step. The world owns the lists; this file owns their behaviour.
import { ENEMY, FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 60,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    r: PLAYER.r,
    hp: PLAYER.hp,
    maxHp: PLAYER.hp,
    fireTimer: 0,
    invuln: 0,
    shield: 0,
    shieldTimer: 0,
    trailTimer: 0,
    upgrades: {},
    stats: {
      damage: PLAYER.bulletDamage,
      fireInterval: PLAYER.fireInterval,
      multishot: 1,
      pierce: 0,
      bulletSpeed: PLAYER.bulletSpeed,
      magnet: PLAYER.magnet,
      speed: PLAYER.maxSpeed,
    },
  };
}

export function burst(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = state.rng.range(0, Math.PI * 2);
    const v = state.rng.range(speed * 0.3, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: state.rng.range(0.25, 0.6),
      maxLife: 0.6,
      size: state.rng.range(1.5, 3.5),
      color,
    });
  }
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 0.7, maxLife: 0.7 });
}

function spawnEdgePoint(rng) {
  const side = rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: rng.range(m, FIELD.width - m), y: -m };
  if (side === 1) return { x: rng.range(m, FIELD.width - m), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: rng.range(m, FIELD.height - m) };
  return { x: FIELD.width + m, y: rng.range(m, FIELD.height - m) };
}

export function spawnEnemy(state, type, x, y) {
  const def = ENEMY[type];
  const scale = 1 + (state.wave - 1) * 0.06;
  const point = x === undefined ? spawnEdgePoint(state.rng) : { x, y };
  const enemy = {
    type,
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    r: def.r,
    hp: Math.round(def.hp * scale),
    maxHp: Math.round(def.hp * scale),
    speed: def.speed * (1 + (state.wave - 1) * 0.03),
    score: def.score,
    shards: def.shards,
    damage: def.damage,
    color: def.color,
    t: state.rng.range(0, Math.PI * 2),
    shootTimer: state.rng.range(1, 2),
    burstTimer: 0,
    flash: 0,
  };
  state.enemies.push(enemy);
  return enemy;
}

export function spawnBoss(state) {
  const boss = spawnEnemy(state, 'warden', FIELD.width / 2, -80);
  boss.y = 90;
  return boss;
}

function fireBullets(state, player, aim) {
  const n = player.stats.multishot;
  const base = Math.atan2(aim.y - player.y, aim.x - player.x);
  for (let i = 0; i < n; i += 1) {
    const spread = (i - (n - 1) / 2) * 0.09;
    const a = base + spread;
    state.bullets.push({
      x: player.x + Math.cos(a) * (player.r + 6),
      y: player.y + Math.sin(a) * (player.r + 6),
      vx: Math.cos(a) * player.stats.bulletSpeed,
      vy: Math.sin(a) * player.stats.bulletSpeed,
      r: PLAYER.bulletR,
      damage: player.stats.damage,
      pierce: player.stats.pierce,
    });
  }
  player.angle = base;
}

export function updatePlayer(state, move, aim, dt, audio) {
  const p = state.player;
  p.vx += move.x * PLAYER.accel * dt;
  p.vy += move.y * PLAYER.accel * dt;
  const speed = Math.hypot(p.vx, p.vy);
  const max = p.stats.speed;
  if (speed > max) {
    p.vx = (p.vx / speed) * max;
    p.vy = (p.vy / speed) * max;
  }
  const drag = Math.exp(-PLAYER.friction * dt);
  p.vx *= drag;
  p.vy *= drag;
  p.x = Math.min(FIELD.width - p.r, Math.max(p.r, p.x + p.vx * dt));
  p.y = Math.min(FIELD.height - p.r, Math.max(p.r, p.y + p.vy * dt));
  p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);
  if (p.invuln > 0) p.invuln -= dt;
  if (p.shieldTimer > 0) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) p.shield = 0;
  }
  p.trailTimer -= dt;
  if (speed > 60 && p.trailTimer <= 0) {
    p.trailTimer = 0.03;
    state.particles.push({
      x: p.x - Math.cos(p.angle) * p.r,
      y: p.y - Math.sin(p.angle) * p.r,
      vx: -p.vx * 0.1,
      vy: -p.vy * 0.1,
      life: 0.3,
      maxLife: 0.3,
      size: 2.5,
      color: '#2de2ff',
    });
  }
  p.fireTimer -= dt;
  if (p.fireTimer <= 0) {
    p.fireTimer = p.stats.fireInterval;
    fireBullets(state, p, aim);
    if (audio) audio.shoot();
  }
}

export function updateBullets(state, dt, audio) {
  const bullets = state.bullets;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
    if (!dead) {
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const e = state.enemies[j];
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.r + b.r;
        if (dx * dx + dy * dy < rr * rr) {
          e.hp -= b.damage;
          e.flash = 0.08;
          addFloater(state, b.x, b.y - 8, String(b.damage), '#b8f6ff');
          burst(state, b.x, b.y, e.color, 3, 120);
          if (audio) audio.hit();
          if (e.hp <= 0) {
            killEnemy(state, j, audio);
          }
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) bullets.splice(i, 1);
  }
}

export function killEnemy(state, index, audio) {
  const e = state.enemies[index];
  state.enemies.splice(index, 1);
  state.kills += 1;
  state.score += e.score;
  burst(state, e.x, e.y, e.color, e.type === 'warden' ? 60 : 14, 260);
  if (audio) audio.explode();
  for (let i = 0; i < e.shards; i += 1) {
    const a = state.rng.range(0, Math.PI * 2);
    state.shards.push({
      x: e.x + Math.cos(a) * 10,
      y: e.y + Math.sin(a) * 10,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      r: 6,
      t: state.rng.range(0, Math.PI * 2),
    });
  }
  if (e.type === 'splitter') {
    for (let i = 0; i < 3; i += 1) {
      const m = spawnEnemy(state, 'mote', e.x + state.rng.range(-16, 16), e.y + state.rng.range(-16, 16));
      m.hp = Math.round(m.hp * 0.6);
    }
  }
}

export function updateEnemies(state, dt, audio) {
  const p = state.player;
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    if (e.type === 'mote') {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
    } else if (e.type === 'weaver') {
      const perp = Math.sin(e.t * 3) * 0.8;
      e.vx = nx * e.speed + -ny * perp * e.speed;
      e.vy = ny * e.speed + nx * perp * e.speed;
    } else if (e.type === 'splitter') {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
    } else if (e.type === 'spitter') {
      const want = 220;
      const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
      e.vx = nx * e.speed * toward;
      e.vy = ny * e.speed * toward;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 420) {
        e.shootTimer = state.rng.range(1.6, 2.4);
        state.ebullets.push({
          x: e.x,
          y: e.y,
          vx: nx * 170,
          vy: ny * 170,
          r: 7,
          damage: e.damage,
        });
      }
    } else if (e.type === 'warden') {
      // The boss drifts toward the player and, every few seconds, fires a ring.
      e.vx = nx * e.speed;
      e.vy = ny * e.speed * 0.6;
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) {
        e.burstTimer = 3.2;
        for (let k = 0; k < 12; k += 1) {
          const a = (k / 12) * Math.PI * 2 + e.t;
          state.ebullets.push({
            x: e.x + Math.cos(a) * e.r,
            y: e.y + Math.sin(a) * e.r,
            vx: Math.cos(a) * 140,
            vy: Math.sin(a) * 140,
            r: 7,
            damage: e.damage,
          });
        }
        if (audio) audio.boss();
        state.shake = Math.max(state.shake, 6);
      }
      if (e.hp < e.maxHp * 0.5 && state.rng.chance(dt * 0.5)) {
        spawnEnemy(state, 'mote', e.x + state.rng.range(-60, 60), e.y + 40);
      }
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    // Contact with the player hurts, once per touch, with a short grace window.
    const pdx = p.x - e.x;
    const pdy = p.y - e.y;
    const prr = p.r + e.r;
    if (pdx * pdx + pdy * pdy < prr * prr && p.invuln <= 0) {
      hurtPlayer(state, e.damage, audio);
      const push = 260;
      p.vx += (pdx / (Math.hypot(pdx, pdy) || 1)) * push;
      p.vy += (pdy / (Math.hypot(pdx, pdy) || 1)) * push;
    }
  }
}

export function hurtPlayer(state, damage, audio) {
  const p = state.player;
  if (p.invuln > 0) return;
  if (p.shield > 0) {
    p.shield -= 1;
    p.shieldTimer = 0;
    p.invuln = 0.6;
    burst(state, p.x, p.y, '#7dffce', 10, 200);
    addFloater(state, p.x, p.y - 22, 'BLOCKED', '#7dffce');
    if (audio) audio.hit();
    return;
  }
  p.hp -= damage;
  p.invuln = PLAYER.invulnTime;
  state.shake = Math.max(state.shake, 8);
  state.flash = 0.25;
  burst(state, p.x, p.y, '#ff5d7a', 12, 220);
  addFloater(state, p.x, p.y - 22, `-${damage}`, '#ff5d7a');
  if (audio) audio.hurt();
}

export function updateEnemyBullets(state, dt, audio) {
  const p = state.player;
  for (let i = state.ebullets.length - 1; i >= 0; i -= 1) {
    const b = state.ebullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
    if (!dead) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const rr = p.r + b.r;
      if (dx * dx + dy * dy < rr * rr && p.invuln <= 0) {
        hurtPlayer(state, b.damage, audio);
        dead = true;
      }
    }
    if (dead) state.ebullets.splice(i, 1);
  }
}

export function updateShards(state, dt, audio) {
  const p = state.player;
  for (let i = state.shards.length - 1; i >= 0; i -= 1) {
    const s = state.shards[i];
    s.t += dt;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < p.stats.magnet) {
      s.vx += (dx / dist) * 900 * dt;
      s.vy += (dy / dist) * 900 * dt;
    } else {
      s.vx *= Math.exp(-3 * dt);
      s.vy *= Math.exp(-3 * dt);
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (dist < p.r + s.r + 4) {
      state.shards.splice(i, 1);
      state.xp += 1;
      state.score += 5;
      burst(state, s.x, s.y, '#ffd75e', 3, 90);
      if (audio) audio.pickup();
    }
  }
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-2 * dt);
    pt.vy *= Math.exp(-2 * dt);
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
}

export function updateFloaters(state, dt) {
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
}
