import { gameState, addFloat } from '../state.js';
import { getWaveDef } from '../config/waves.js';
import { spawnCreepFromDef } from '../entities/creep.js';
import { BOARD_W, WAVE_INTERVAL, INCOME_INTERVAL } from '../config/constants.js';
import { sfx } from './sfx.js';

/**
 * Kick off the next wave: queues baseline creeps on both lanes.
 * These are a bounty drip — the real pressure comes from player sends.
 */
export function startWave() {
  const { player, ai } = gameState;
  const def = getWaveDef(gameState.waveNum);

  for (let i = 0; i < def.count; i++) {
    player.spawnQueue.push({ def, delay: i * 0.6 });
    ai.spawnQueue.push({ def, delay: i * 0.6 });
  }

  gameState.waveNum++;
  gameState.waveTimer = WAVE_INTERVAL;
  sfx('wave');
}

/**
 * Pay both players their periodic income. Called on the income tick timer.
 */
export function payIncome() {
  const { player, ai } = gameState;
  player.gold += player.income;
  ai.gold     += ai.income;

  addFloat(player, player.offsetX + BOARD_W / 2, 16, `+${player.income} income`, '#90ee90');
  addFloat(ai,     ai.offsetX     + BOARD_W / 2, 16, `+${ai.income} income`,     '#90ee90');

  gameState.incomeTimer = INCOME_INTERVAL;
  gameState.incomePulse = true;   // HUD pulse, consumed by GameScene
  sfx('income');
}

/**
 * Drain each player's spawn queue, spawning any creeps whose delay has elapsed.
 */
export function processSpawnQueue(p, dt) {
  p.spawnQueue.forEach(q => (q.delay -= dt));

  const ready = p.spawnQueue.filter(q => q.delay <= 0);
  p.spawnQueue = p.spawnQueue.filter(q => q.delay > 0);

  ready.forEach(q => spawnCreepFromDef(p, q.def));
}

/**
 * Dispatch unit(s) from `sender` into `target`'s lane.
 * The sender's income rises permanently — sending IS the economy.
 */
export function sendUnit(sender, target, def, count = 1) {
  for (let i = 0; i < count; i++) {
    target.spawnQueue.push({ def, delay: i * 0.5 });
  }
  sender.income += def.incomeBonus;
  addFloat(sender, sender.offsetX + BOARD_W / 2, 32, `+${def.incomeBonus} income`, '#90ee90');
  sfx('send');
}
