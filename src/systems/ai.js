import { gameState, addFloat } from '../state.js';
import { TOWERS } from '../config/towers.js';
import { SEND_UNITS } from '../config/units.js';
import { placeTower, upgradeTower, nextUpgrade, towerStats } from '../entities/tower.js';
import { sendUnit } from './waves.js';
import { ROWS, COLS, CELL, BOARD_W, INCOME_INTERVAL } from '../config/constants.js';

// ─── Tuning knobs ─────────────────────────────────────────────────────────────
const DECIDE_INTERVAL      = 2;     // seconds between AI decisions
const GOLD_RESERVE         = 120;   // eco mode keeps this much banked
const DEFEND_LIVES_LOST    = 2;     // lives lost within DEFEND_WINDOW → defend
const DEFEND_WINDOW        = 10;    // seconds
const DEFEND_CREEP_COUNT   = 12;    // creeps in lane → defend
const PRESSURE_INCOME_RATIO = 1.25; // ai income vs player income → pressure
const PRESSURE_PLAYER_LIVES = 8;    // player at/below this → pressure
const FORCE_SEND_AFTER     = 45;    // seconds without a send → force one
const FORCE_SEND_MIN_GOLD  = 200;
const ECO_BUILD_INTERVAL   = INCOME_INTERVAL * 3; // ~1 tower per 3 income ticks
const ECO_UPGRADE_CHANCE   = 0.4;   // eco builds that upgrade instead of placing

export function makeAIState() {
  return {
    decideTimer:  DECIDE_INTERVAL,
    elapsed:      0,
    lastSendAt:   0,
    buildTimer:   ECO_BUILD_INTERVAL / 2, // first eco tower arrives early
    prevLives:    20,
    lifeLossLog:  [],   // timestamps of recent life losses
    mode:         'eco',
  };
}

/**
 * Tick the AI — called every frame, acts every DECIDE_INTERVAL seconds.
 * Three modes:
 *   eco      (default) — bank a reserve, dump surplus into the largest send
 *   defend   — bleeding lives or swamped: build maze towers on the path
 *   pressure — income lead or wounded player: all-in Boss/Jugger + Swarm
 */
export function updateAI(dt) {
  const { ai, player } = gameState;
  const s = gameState.aiState;

  s.elapsed    += dt;
  s.buildTimer -= dt;

  // Track recent life losses for the defend trigger
  if (ai.lives < s.prevLives) {
    for (let i = 0; i < s.prevLives - ai.lives; i++) s.lifeLossLog.push(s.elapsed);
    s.prevLives = ai.lives;
  }
  s.lifeLossLog = s.lifeLossLog.filter(t => s.elapsed - t < DEFEND_WINDOW);

  s.decideTimer -= dt;
  if (s.decideTimer > 0) return;
  s.decideTimer = DECIDE_INTERVAL;

  s.mode = _pickMode(ai, player, s);

  switch (s.mode) {
    case 'defend':   _actDefend(ai);            break;
    case 'pressure': _actPressure(ai, player, s); break;
    default:         _actEco(ai, player, s);
  }

  // Anti-emptiness guard: never go silent for too long
  if (s.elapsed - s.lastSendAt > FORCE_SEND_AFTER && ai.gold > FORCE_SEND_MIN_GOLD) {
    const def = _largestAffordableSend(ai.gold);
    if (def) _doSend(ai, player, s, def);
  }
}

// ─── Mode selection ───────────────────────────────────────────────────────────

function _pickMode(ai, player, s) {
  if (s.lifeLossLog.length >= DEFEND_LIVES_LOST || ai.creeps.length > DEFEND_CREEP_COUNT)
    return 'defend';
  if (ai.income >= player.income * PRESSURE_INCOME_RATIO || player.lives <= PRESSURE_PLAYER_LIVES)
    return 'pressure';
  return 'eco';
}

// ─── Behaviours ───────────────────────────────────────────────────────────────

/** Bank GOLD_RESERVE, spend the surplus on the largest send, build occasionally. */
function _actEco(ai, player, s) {
  const def = _largestAffordableSend(ai.gold - GOLD_RESERVE);
  if (def) _doSend(ai, player, s, def);

  if (s.buildTimer <= 0) {
    const built = Math.random() < ECO_UPGRADE_CHANCE
      ? _upgradeBestTower(ai) || _buildTower(ai)
      : _buildTower(ai);
    if (built) s.buildTimer = ECO_BUILD_INTERVAL;
  }
}

/** Bleeding — spend on maze towers and upgrades along the current path. */
function _actDefend(ai) {
  _upgradeBestTower(ai);
  // Up to two towers per decision while gold allows
  for (let i = 0; i < 2; i++) {
    if (!_buildTower(ai)) break;
  }
}

/** Income lead or wounded player — dump gold into big-plus-fast combos. */
function _actPressure(ai, player, s) {
  const { boss, juggernaut, swarm } = SEND_UNITS;

  const big = _isUnlocked(juggernaut) && ai.gold >= juggernaut.cost ? juggernaut
            : _isUnlocked(boss)       && ai.gold >= boss.cost       ? boss
            : null;
  if (big) _doSend(ai, player, s, big);

  // Chase the big send with swarms while gold remains
  while (_isUnlocked(swarm) && ai.gold >= swarm.cost) {
    _doSend(ai, player, s, swarm);
  }

  // Nothing big affordable yet? Fall back to the largest send available.
  if (!big) {
    const def = _largestAffordableSend(ai.gold);
    if (def) _doSend(ai, player, s, def);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _isUnlocked(def) {
  return gameState.waveNum >= def.unlockWave;
}

function _largestAffordableSend(budget) {
  return Object.values(SEND_UNITS)
    .filter(u => _isUnlocked(u) && u.cost <= budget)
    .sort((a, b) => b.cost - a.cost)[0] ?? null;
}

function _doSend(ai, player, s, def) {
  ai.gold -= def.cost;
  sendUnit(ai, player, def, def.count ?? 1);
  s.lastSendAt = s.elapsed;
  addFloat(ai, ai.offsetX + BOARD_W / 2, 55, `Sent ${def.name}!`, '#ffa0a0');
}

/**
 * Place one tower on a cell adjacent to the AI's current creep path —
 * real maze-lengthening rather than random scatter. Returns success.
 */
function _buildTower(ai) {
  const affordable = Object.values(TOWERS).filter(t => t.cost <= ai.gold);
  if (!affordable.length) return false;
  // Prefer the most expensive tower it can afford
  const def = affordable.sort((a, b) => b.cost - a.cost)[0];

  const candidates = _pathAdjacentCells(ai);
  for (const [row, col] of candidates) {
    if (placeTower(ai, row, col, def)) return true;
  }
  // Fallback: random valid cell
  for (let attempt = 0; attempt < 25; attempt++) {
    const row = Math.floor(Math.random() * ROWS);
    const col = 1 + Math.floor(Math.random() * (COLS - 2));
    if (placeTower(ai, row, col, def)) return true;
  }
  return false;
}

/** Upgrade the affordable tower whose range covers the most path cells. */
function _upgradeBestTower(ai) {
  let best = null, bestCover = -1;
  for (const t of ai.towers) {
    const up = nextUpgrade(t);
    if (!up || up.cost > ai.gold) continue;
    const cover = _pathCoverage(ai, t);
    if (cover > bestCover) { best = t; bestCover = cover; }
  }
  return best ? upgradeTower(ai, best) : false;
}

/** Number of path cells within a tower's range. */
function _pathCoverage(ai, t) {
  const stats = towerStats(t);
  const rng = stats.range * CELL;
  const tx  = ai.offsetX + t.col * CELL + CELL / 2;
  const ty  = t.row * CELL + CELL / 2;
  let n = 0;
  for (const [r, c] of ai.path ?? []) {
    const wx = ai.offsetX + c * CELL + CELL / 2;
    const wy = r * CELL + CELL / 2;
    if (Math.hypot(wx - tx, wy - ty) <= rng) n++;
  }
  return n;
}

/** Shuffled list of empty cells 4-adjacent to the AI's current path. */
function _pathAdjacentCells(ai) {
  const seen = new Set();
  const out  = [];
  for (const [r, c] of ai.path ?? []) {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      const key = nr * COLS + nc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || seen.has(key)) continue;
      seen.add(key);
      if (ai.grid[nr][nc] === 0) out.push([nr, nc]);
    }
  }
  // Fisher–Yates shuffle so mazes vary game to game
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
