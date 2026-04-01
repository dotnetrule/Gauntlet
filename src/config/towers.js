/**
 * Tower definitions.
 * cn  = Phaser color number (0xRRGGBB)
 * cs  = CSS color string   (#rrggbb) — used in HTML UI
 * rate = attacks per second
 * splash = AoE radius in tiles (0 = no splash)
 * slow = fraction of speed removed (0.45 = 45% slow)
 */
export const TOWERS = {
  basic: {
    id: 'basic', name: 'Arrow', cost: 50, sell: 25,
    cn: 0x4488cc, cs: '#4488cc',
    range: 3.5, damage: 12, rate: 1.2, splash: 0, slow: 0,
    desc: 'Fast single target', shape: 'rect',
  },
  cannon: {
    id: 'cannon', name: 'Cannon', cost: 120, sell: 60,
    cn: 0xcc8844, cs: '#cc8844',
    range: 3.0, damage: 60, rate: 0.5, splash: 1.3, slow: 0,
    desc: 'AoE splash damage', shape: 'circle',
  },
  frost: {
    id: 'frost', name: 'Frost', cost: 90, sell: 45,
    cn: 0x88ccff, cs: '#88ccff',
    range: 3.5, damage: 8, rate: 1.0, splash: 0, slow: 0.45,
    desc: 'Slows creeps 45%', shape: 'diamond',
  },
  sniper: {
    id: 'sniper', name: 'Sniper', cost: 200, sell: 100,
    cn: 0xaa44ff, cs: '#aa44ff',
    range: 7.0, damage: 120, rate: 0.4, splash: 0, slow: 0,
    desc: 'Extreme range + damage', shape: 'rect',
  },
  flamethrower: {
    id: 'flamethrower', name: 'Flame', cost: 160, sell: 80,
    cn: 0xff6622, cs: '#ff6622',
    range: 2.5, damage: 20, rate: 3.0, splash: 0.8, slow: 0,
    desc: 'Rapid AoE burst', shape: 'circle',
  },
};
