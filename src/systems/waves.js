import { gameState, addFloat } from '../state.js';
import { getWaveDef } from '../config/waves.js';
import { computePath } from './pathfinding.js';
import { BOARD_W } from '../config/constants.js';

/**
 * Kick off the next wave: queues creeps on both lanes and grants income.
 */
export function startWave() {
  const { player, ai } = gameState;
  const def = getWaveDef(gameState.waveNum);

  for (let i = 0; i < def.count; i++) {
    player.spawnQueue.push({ def, delay: i * 0.6 });
    ai.spawnQueue.push({ def, delay: i * 0.6 });
  }

  // Grant income gold
  player.gold += player.income;
  ai.gold     += ai.income;

  addFloat(player, player.offsetX + BOARD_W / 2, 16, `+${player.income} income`, '#90ee90');
  addFloat(ai,     ai.offsetX     + BOARD_W / 2, 16, `+${ai.income} income`,     '#90ee90');

  gameState.waveNum++;
  gameState.waveTimer = 25;
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
 * Dispatch unit(s) from def into target player's lane.
 */
export function sendUnit(target, def, count = 1) {
  for (let i = 0; i < count; i++) {
    target.spawnQueue.push({ def, delay: i * 0.5 });
  }
}

// ── internal ──────────────────────────────────────────────────────────────────
// Kept here to avoid circular imports (creep.js → waves.js → creep.js).
// The actual creep spawning logic lives in entities/creep.js and is re-exported
// via the spawn queue mechanism, so we inline a minimal version here.
import { CELL, SPAWN_COL, SPAWN_ROW } from '../config/constants.js';

function spawnCreepFromDef(p, def) {
  const path = computePath(p.grid);
  if (!path) return;
  p.creeps.push({
    x: p.offsetX + SPAWN_COL * CELL + CELL / 2,
    y: SPAWN_ROW * CELL + CELL / 2,
    hp:    def.hp,
    maxHp: def.hp,
    speed:  def.speed,
    reward: def.reward,
    cn:     def.cn,
    size:   def.size ?? 6,
    slow: 0, slowTimer: 0,
    pathIndex: 1,
    path,
  });
}
