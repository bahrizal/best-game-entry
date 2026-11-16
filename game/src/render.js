// Everything the player sees: the arena, the ships, the HUD and the five screens
// (title, play, level-up, paused, over, win). All drawing happens in field
// coordinates; draw() scales the 960x600 field to fit the canvas.
import { COLORS, FIELD, WAVES_TOTAL, xpNeed } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Which level-up card, if any, sits under a field point (the same geometry
// drawLevelUp paints with); -1 when the point is on no card.
export function levelUpCardAt(x, y, count) {
  if (count <= 0 || y < 190 || y > 380) return -1;
  const w = 250;
  const gap = 24;
  const total = count * w + (count - 1) * gap;
  const left = (FIELD.width - total) / 2;
  const at = Math.floor((x - left) / (w + gap));
  if (at < 0 || at >= count) return -1;
  const within = x - left - at * (w + gap);
  return within <= w ? at : -1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return { scale };
  }

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, COLORS.bgTop);
    g.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const s of state.stars) {
      ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(s.tw));
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 60; x < FIELD.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 60; y < FIELD.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = COLORS.wall;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, FIELD.width - 2, FIELD.height - 2);
    ctx.globalAlpha = 1;
  }

  function drawShards(state) {
    for (const s of state.shards) {
      const bob = Math.sin(s.t * 4) * 1.5;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.shard;
      ctx.shadowColor = COLORS.shard;
      ctx.shadowBlur = 8;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  function drawEnemies(state) {
    for (const e of state.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
      if (e.type === 'mote') {
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0512';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'weaver') {
        ctx.rotate(e.t * 2);
        ctx.fillRect(-e.r * 0.8, -e.r * 0.8, e.r * 1.6, e.r * 1.6);
      } else if (e.type === 'splitter') {
        ctx.rotate(e.t * 0.6);
        ctx.beginPath();
        for (let k = 0; k < 6; k += 1) {
          const a = (k / 6) * Math.PI * 2;
          const px = Math.cos(a) * e.r;
          const py = Math.sin(a) * e.r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'spitter') {
        ctx.rotate(e.t);
        ctx.fillRect(-e.r * 0.75, -e.r * 0.75, e.r * 1.5, e.r * 1.5);
        ctx.fillStyle = '#0c1a08';
        ctx.fillRect(-e.r * 0.35, -e.r * 0.35, e.r * 0.7, e.r * 0.7);
      } else {
        // The Warden: a spiked ring with a hot core.
        ctx.rotate(e.t * 0.4);
        ctx.beginPath();
        for (let k = 0; k < 12; k += 1) {
          const a = (k / 12) * Math.PI * 2;
          const rad = k % 2 === 0 ? e.r : e.r * 0.72;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.rotate(-e.t * 0.4);
        ctx.fillStyle = '#ffd2d2';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // A thin HP bar over anything hurt.
      if (e.hp < e.maxHp && e.type !== 'warden') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - 16, e.y - e.r - 10, 32, 4);
        ctx.fillStyle = COLORS.danger;
        ctx.fillRect(e.x - 16, e.y - e.r - 10, 32 * (e.hp / e.maxHp), 4);
      }
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 18;
    ctx.rotate(p.angle);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(p.r + 6, 0);
    ctx.lineTo(-p.r, p.r * 0.8);
    ctx.lineTo(-p.r * 0.45, 0);
    ctx.lineTo(-p.r, -p.r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.shield > 0) {
      ctx.save();
      ctx.strokeStyle = '#7dffce';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullets(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bullets) {
      ctx.strokeStyle = COLORS.bullet;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const b of state.ebullets) {
      ctx.fillStyle = COLORS.ebullet;
      ctx.shadowColor = COLORS.ebullet;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloaters(state) {
    ctx.save();
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function bar(x, y, w, h, frac, color, bg) {
    ctx.fillStyle = bg;
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = color;
      rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
      ctx.fill();
    }
  }

  function drawHud(state) {
    const p = state.player;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Top-left: hull.
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('HULL', 16, 24);
    bar(16, 30, 170, 12, p.hp / p.maxHp, COLORS.hp, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`, 192, 41);
    // Top-centre: wave and time.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.max(1, state.wave)} / ${WAVES_TOTAL}`, FIELD.width / 2, 24);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(fmtTime(state.time), FIELD.width / 2, 41);
    // Top-right: score and kills.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`SCORE ${state.score}`, FIELD.width - 16, 24);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${state.kills} kills · LV ${state.level}`, FIELD.width - 16, 41);
    // Boss bar.
    if (state.boss) {
      const b = state.boss;
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.warden;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('THE WARDEN', FIELD.width / 2, 62);
      bar(FIELD.width / 2 - 150, 68, 300, 10, b.hp / b.maxHp, COLORS.warden, 'rgba(255,255,255,0.14)');
    }
    // Bottom: XP bar.
    const need = xpNeed(state.level);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, FIELD.height - 10, FIELD.width, 10);
    ctx.fillStyle = COLORS.xp;
    ctx.fillRect(0, FIELD.height - 10, FIELD.width * Math.min(1, state.xp / need), 10);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(`LV ${state.level}  ·  XP ${state.xp}/${need}`, 16, FIELD.height - 20);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('P pause · M mute · R restart', FIELD.width - 16, FIELD.height - 20);
    ctx.restore();
    // Wave banner.
    if (state.bannerTimer > 0 && state.banner) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.bannerTimer);
      ctx.textAlign = 'center';
      ctx.font = '700 34px system-ui, sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.shadowColor = COLORS.wall;
      ctx.shadowBlur = 18;
      ctx.fillText(state.banner, FIELD.width / 2, FIELD.height / 2 - 60);
      ctx.restore();
    }
  }

  function panel(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 18, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = '700 44px system-ui, sans-serif';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.fillText(title, FIELD.width / 2, 190);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, 240 + i * 26);
    });
    ctx.restore();
  }

  function drawTitle(state, best) {
    panel('NEON TIDE', [
      'Survive 10 waves. Break the Warden. Ride the tide.',
      '',
      'WASD / arrows — fly      Mouse — aim (fire is automatic)',
      'Collect shards to level up and choose upgrades.',
      '',
      best > 0 ? `Best score: ${best}` : 'No runs yet — the tide is waiting.',
      '',
      'Press SPACE or click to start',
    ], COLORS.player);
  }

  function drawLevelUp(state) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 18, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.xp;
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.shadowColor = COLORS.xp;
    ctx.shadowBlur = 16;
    ctx.fillText(`LEVEL ${state.level} — CHOOSE AN UPGRADE`, FIELD.width / 2, 130);
    ctx.shadowBlur = 0;
    const cards = state.choices;
    const w = 250;
    const gap = 24;
    const total = cards.length * w + (cards.length - 1) * gap;
    let x = (FIELD.width - total) / 2;
    cards.forEach((card, i) => {
      const owned = state.player.upgrades[card.id] || 0;
      ctx.fillStyle = 'rgba(20, 32, 64, 0.95)';
      rr(ctx, x, 190, w, 190, 14);
      ctx.fill();
      ctx.strokeStyle = COLORS.xp;
      ctx.lineWidth = 2;
      rr(ctx, x, 190, w, 190, 14);
      ctx.stroke();
      ctx.fillStyle = COLORS.dim;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(`PRESS ${i + 1}`, x + w / 2, 222);
      ctx.fillStyle = COLORS.text;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText(card.name, x + w / 2, 258);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(card.blurb, x + w / 2, 292);
      ctx.fillStyle = COLORS.xp;
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(owned > 0 ? `Owned: ${owned} / ${card.max}` : `New · max ${card.max}`, x + w / 2, 340);
      x += w + gap;
    });
    ctx.fillStyle = COLORS.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Click a card or press 1 / 2 / 3', FIELD.width / 2, 430);
    ctx.restore();
  }

  function drawOver(state, best, won) {
    const title = won ? 'TIDE TAMED' : 'THE TIDE TOOK YOU';
    const accent = won ? COLORS.hp : COLORS.danger;
    panel(title, [
      won ? 'The Warden is broken. Ten waves survived.' : `You fell on wave ${Math.max(1, state.wave)} of ${WAVES_TOTAL}.`,
      '',
      `Score  ${state.score}      Best  ${Math.max(best, state.score)}`,
      `Waves  ${state.wave}      Kills  ${state.kills}      Level  ${state.level}`,
      `Time  ${fmtTime(state.time)}`,
      '',
      'Press R or click to play again',
    ], accent);
  }

  function drawPaused() {
    panel('PAUSED', ['', 'Take a breath. The tide waits.', '', 'Press P or click to resume'], COLORS.dim);
  }

  function draw(state, screen, best) {
    frame();
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    drawShards(state);
    drawEnemies(state);
    if (screen !== SCREEN_TITLE) drawPlayer(state);
    drawBullets(state);
    drawFloaters(state);
    ctx.restore();
    if (screen === SCREEN_PLAY || screen === SCREEN_LEVELUP || screen === SCREEN_PAUSED) drawHud(state);
    if (state.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.flash * 1.6;
      ctx.fillStyle = '#ff2d55';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.restore();
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_LEVELUP) drawLevelUp(state);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best, false);
    else if (screen === SCREEN_WIN) drawOver(state, best, true);
  }

  return { draw, resize };
}
