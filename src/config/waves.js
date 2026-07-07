/**
 * Baseline creep tiers — a small bounty drip that keeps mazes working.
 * The real pressure (and top-tier monsters) comes from player sends,
 * so tiers cap at Ogre and rewards are modest.
 */
const WAVE_TIERS = [
  { hp:  80,  speed: 55, reward: 3, cn: 0x88ff88, name: 'Footman' },
  { hp: 220,  speed: 50, reward: 5, cn: 0xffaa44, name: 'Grunt'   },
  { hp: 550,  speed: 45, reward: 8, cn: 0xff6644, name: 'Ogre'    },
];

/**
 * Returns the creep definition for a given wave number.
 * Tier advances every 4 waves (capped); HP scales +12% per wave.
 */
export function getWaveDef(waveNum) {
  const tierIdx = Math.min(Math.floor((waveNum - 1) / 4), WAVE_TIERS.length - 1);
  const base    = WAVE_TIERS[tierIdx];
  return {
    ...base,
    hp:    Math.round(base.hp * (1 + (waveNum - 1) * 0.12)),
    count: 4 + Math.floor(waveNum / 4),
    size:  6,
  };
}
