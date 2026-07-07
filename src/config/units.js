/**
 * Send-unit definitions — units the player dispatches into the opponent's lane.
 * count       = how many are sent per purchase (default 1)
 * incomeBonus = permanent income added to the SENDER on purchase
 * unlockWave  = first wave number this unit can be sent
 *
 * Payback is ~9–13 income ticks; bigger sends are slightly more
 * income-efficient, rewarding saving up (the Wintermaul Wars eco gamble).
 */
export const SEND_UNITS = {
  runner: {
    id: 'runner', name: 'Runner', cost: 50,  hp: 250,   speed: 90,
    incomeBonus: 4,   unlockWave: 1,
    reward: 5,  cn: 0x88ff88, cs: '#88ff88', size: 5,
    desc: 'Fast, low HP',
  },
  swarm: {
    id: 'swarm',  name: 'Swarm',  cost: 110, hp: 130,   speed: 75,
    incomeBonus: 10,  unlockWave: 2,
    reward: 3,  cn: 0xffff44, cs: '#ffff44', size: 4,
    desc: 'Sends 6 at once', count: 6,
  },
  brute: {
    id: 'brute',  name: 'Brute',  cost: 150, hp: 1100,  speed: 45,
    incomeBonus: 14,  unlockWave: 4,
    reward: 15, cn: 0xff8844, cs: '#ff8844', size: 7,
    desc: 'Tanky, slow',
  },
  boss: {
    id: 'boss',   name: 'Boss',   cost: 400, hp: 4500,  speed: 32,
    incomeBonus: 42,  unlockWave: 8,
    reward: 45, cn: 0xff4444, cs: '#ff4444', size: 10,
    desc: 'Massive HP brute',
  },
  juggernaut: {
    id: 'juggernaut', name: 'Jugger', cost: 900, hp: 12000, speed: 28,
    incomeBonus: 110, unlockWave: 13,
    reward: 100, cn: 0xdd22ff, cs: '#dd22ff', size: 12,
    desc: 'Late-game siege monster',
  },
};
