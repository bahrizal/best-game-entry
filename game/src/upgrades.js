// Level-up choices: eight upgrades, each stackable to five. rollChoices picks three
// the player can still take; applyUpgrade folds one into the player's stats.
export const UPGRADES = [
  {
    id: 'damage',
    name: 'Heavy Rounds',
    blurb: '+4 bullet damage',
    max: 5,
    apply(p) {
      p.stats.damage += 4;
    },
  },
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    blurb: 'Fire 12% faster',
    max: 5,
    apply(p) {
      p.stats.fireInterval *= 0.88;
    },
  },
  {
    id: 'split',
    name: 'Split Shot',
    blurb: '+1 bullet per shot',
    max: 3,
    apply(p) {
      p.stats.multishot += 1;
    },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    blurb: 'Bullets pass through +1 enemy',
    max: 3,
    apply(p) {
      p.stats.pierce += 1;
    },
  },
  {
    id: 'swift',
    name: 'Ion Thrusters',
    blurb: '+12% move speed',
    max: 4,
    apply(p) {
      p.stats.speed *= 1.12;
    },
  },
  {
    id: 'vitality',
    name: 'Hull Plating',
    blurb: '+25 max HP, heal 25',
    max: 4,
    apply(p) {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 25);
    },
  },
  {
    id: 'magnet',
    name: 'Tractor Field',
    blurb: '+45% shard pickup range',
    max: 4,
    apply(p) {
      p.stats.magnet *= 1.45;
    },
  },
  {
    id: 'aegis',
    name: 'Aegis Shield',
    blurb: 'Block the next hit, once a wave',
    max: 3,
    apply(p) {
      p.shield = Math.min(3, p.shield + 1);
      p.shieldTimer = 999;
    },
  },
];

export function rollChoices(rng, owned) {
  const pool = UPGRADES.filter((u) => (owned[u.id] || 0) < u.max);
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(player, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return;
  player.upgrades[id] = (player.upgrades[id] || 0) + 1;
  def.apply(player);
}
