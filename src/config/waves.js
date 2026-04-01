/** Creep type progression — one tier unlocks every 3 waves. */
const WAVE_TIERS = [
  { hp:  80,   speed: 55, reward:  4, cn: 0x88ff88, name: 'Footman' },
  { hp:  200,  speed: 50, reward:  8, cn: 0xffaa44, name: 'Grunt'   },
  { hp:  500,  speed: 45, reward: 15, cn: 0xff6644, name: 'Ogre'    },
  { hp: 1200,  speed: 40, reward: 25, cn: 0xcc44ff, name: 'Troll'   },
  { hp: 3000,  speed: 35, reward: 50, cn: 0xff2244, name: 'Demon'   },
];

/**
 * Returns the creep definition for a given wave number.
 * HP scales +15% per wave within the tier; count grows with wave number.
 */
export function getWaveDef(waveNum) {
  const tierIdx = Math.min(Math.floor((waveNum - 1) / 3), WAVE_TIERS.length - 1);
  const base    = WAVE_TIERS[tierIdx];
  return {
    ...base,
    hp:    Math.round(base.hp * (1 + (waveNum - 1) * 0.15)),
    count: 8 + Math.floor(waveNum / 2),
    size:  6,
  };
}
