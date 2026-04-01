/**
 * Send-unit definitions — units the player dispatches into the opponent's lane.
 * count = how many are sent per purchase (default 1)
 */
export const SEND_UNITS = {
  runner: {
    id: 'runner', name: 'Runner', cost: 60,  hp: 200,  speed: 90,
    reward: 4,  cn: 0x88ff88, cs: '#88ff88', size: 5,
    desc: 'Fast, low HP',
  },
  brute: {
    id: 'brute',  name: 'Brute',  cost: 120, hp: 700,  speed: 45,
    reward: 10, cn: 0xff8844, cs: '#ff8844', size: 7,
    desc: 'Tanky, slow',
  },
  swarm: {
    id: 'swarm',  name: 'Swarm',  cost: 100, hp: 150,  speed: 75,
    reward: 3,  cn: 0xffff44, cs: '#ffff44', size: 4,
    desc: 'Sends 5 at once', count: 5,
  },
  boss: {
    id: 'boss',   name: 'Boss',   cost: 350, hp: 4000, speed: 30,
    reward: 40, cn: 0xff4444, cs: '#ff4444', size: 10,
    desc: 'Massive HP brute',
  },
};
