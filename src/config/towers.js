/**
 * Tower definitions.
 * cn  = Phaser color number (0xRRGGBB)
 * cs  = CSS color string   (#rrggbb) — used in HTML UI
 * rate = attacks per second
 * splash = AoE radius in tiles (0 = no splash)
 * slow = fraction of speed removed (0.45 = 45% slow)
 * chain = number of creeps hit per shot (Lightning only)
 *
 * upgrades = per-tier stat overrides applied on top of the base def.
 * Upgrade dps/gold beats buying more base towers, so upgrading is the
 * smart play when maze tiles are scarce.
 */
export const TOWERS = {
  basic: {
    id: 'basic', name: 'Arrow', cost: 50,
    cn: 0x4488cc, cs: '#4488cc',
    range: 3.5, damage: 25, rate: 1.2, splash: 0, slow: 0,
    desc: 'Fast single target', shape: 'rect',
    sprite: { key: 'tower-blue',   scales: [0.30, 0.34, 0.38] },
    upgrades: [
      { cost: 75,  damage: 30, rate: 1.4 },
      { cost: 150, damage: 75, rate: 1.6 },
    ],
  },
  cannon: {
    id: 'cannon', name: 'Cannon', cost: 120,
    cn: 0xcc8844, cs: '#cc8844',
    range: 3.0, damage: 60, rate: 0.5, splash: 1.3, slow: 0,
    desc: 'AoE splash damage', shape: 'circle',
    sprite: { key: 'wood-tower',   scales: [0.22, 0.25, 0.28], anim: 'wood-tower-anim' },
    upgrades: [
      { cost: 180, damage: 150, splash: 1.5 },
      { cost: 350, damage: 360, splash: 1.8 },
    ],
  },
  frost: {
    id: 'frost', name: 'Frost', cost: 90,
    cn: 0x88ccff, cs: '#88ccff',
    range: 3.5, damage: 8, rate: 1.0, splash: 0, slow: 0.45,
    desc: 'Slows creeps 45%', shape: 'diamond',
    sprite: { key: 'tower-purple', scales: [0.30, 0.34, 0.38], tint: 0xaaccee },
    upgrades: [
      { cost: 135, damage: 18, slow: 0.55 },
      { cost: 260, damage: 40, slow: 0.65 },
    ],
  },
  sniper: {
    id: 'sniper', name: 'Sniper', cost: 200,
    cn: 0xaa44ff, cs: '#aa44ff',
    range: 7.0, damage: 120, rate: 0.4, splash: 0, slow: 0,
    desc: 'Extreme range + damage', shape: 'rect',
    sprite: { key: 'tower-purple', scales: [0.30, 0.34, 0.38] },
    upgrades: [
      { cost: 300, damage: 300, range: 7.5 },
      { cost: 600, damage: 750, range: 8.0 },
    ],
  },
  flamethrower: {
    id: 'flamethrower', name: 'Flame', cost: 160,
    cn: 0xff6622, cs: '#ff6622',
    range: 2.5, damage: 20, rate: 3.0, splash: 0.8, slow: 0,
    desc: 'Rapid AoE burst', shape: 'circle',
    sprite: { key: 'tower-red',    scales: [0.30, 0.34, 0.38] },
    upgrades: [
      { cost: 240, damage: 50,  splash: 0.9 },
      { cost: 480, damage: 120, splash: 1.0 },
    ],
  },
  lightning: {
    id: 'lightning', name: 'Lightning', cost: 240,
    cn: 0xffee44, cs: '#ffee44',
    range: 3.5, damage: 45, rate: 0.8, splash: 0, slow: 0, chain: 3,
    desc: 'Chains to 3 creeps', shape: 'diamond',
    sprite: { key: 'tower-yellow', scales: [0.30, 0.34, 0.38] },
    upgrades: [
      { cost: 360, damage: 110, chain: 4 },
      { cost: 700, damage: 260, chain: 5 },
    ],
  },
};
