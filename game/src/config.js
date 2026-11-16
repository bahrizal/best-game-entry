// Neon Tide: every number the game runs on. One place to tune, so the rest of the
// code never hard-codes a value it might want to change.
export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const BEST_KEY = 'neon-tide-best';
export const WAVES_TOTAL = 10;

export const COLORS = {
  bgTop: '#05070f',
  bgBottom: '#0a1030',
  grid: '#16203a',
  wall: '#2de2ff',
  text: '#eaf6ff',
  dim: '#8fa8c8',
  danger: '#ff5d7a',
  hp: '#3dff9e',
  xp: '#ffd75e',
  player: '#4df3ff',
  playerCore: '#ffffff',
  bullet: '#b8f6ff',
  shard: '#ffd75e',
  mote: '#ff5da2',
  weaver: '#ff9a3d',
  splitter: '#b06bff',
  spitter: '#7dff6a',
  warden: '#ff4d4d',
  ebullet: '#ff7ad9',
  particle: '#9be8ff',
};

export const PLAYER = {
  r: 13,
  accel: 2400,
  maxSpeed: 300,
  friction: 6,
  hp: 100,
  fireInterval: 0.22,
  bulletSpeed: 560,
  bulletDamage: 12,
  bulletR: 4,
  magnet: 90,
  invulnTime: 1.1,
};

// Enemy kinds. hp and speed grow a little with the wave (see waveScale in world.js).
export const ENEMY = {
  mote: { r: 12, hp: 18, speed: 85, score: 10, shards: 1, damage: 10, color: COLORS.mote },
  weaver: { r: 13, hp: 30, speed: 120, score: 15, shards: 2, damage: 12, color: COLORS.weaver },
  splitter: { r: 24, hp: 70, speed: 55, score: 25, shards: 3, damage: 16, color: COLORS.splitter },
  spitter: { r: 14, hp: 26, speed: 80, score: 20, shards: 2, damage: 8, color: COLORS.spitter },
  warden: { r: 52, hp: 1400, speed: 42, score: 1000, shards: 20, damage: 25, color: COLORS.warden },
};

export const SCORE = { kill: 10, waveClear: 100, shard: 5, winBonus: 500 };

export function xpNeed(level) {
  return 8 + level * 6;
}

// How many of each kind a wave fields, and how fast they trickle in.
export function waveComp(n) {
  const comp = { mote: 6 + n * 2, weaver: n >= 2 ? 2 + n : 0, splitter: n >= 3 ? Math.floor(n / 2) : 0, spitter: n >= 4 ? Math.floor((n - 1) / 2) : 0 };
  if (n === WAVES_TOTAL) comp.warden = 1;
  return comp;
}

export function waveInterval(n) {
  return Math.max(0.35, 0.9 - n * 0.05);
}
