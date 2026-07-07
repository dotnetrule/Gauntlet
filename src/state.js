import { makeGrid, computePath } from './systems/pathfinding.js';
import { makeAIState } from './systems/ai.js';
import {
  BOARD_W, GUTTER,
  INCOME_INTERVAL, START_INCOME, START_GOLD,
} from './config/constants.js';

// ─── Shared game state ────────────────────────────────────────────────────────
// A single mutable object imported by every module that needs game data.
// The Phaser scene sets `gameState.scene` in create() so entity modules can
// spawn Phaser Text objects for floating numbers.
export const gameState = {
  player:        null,   // PlayerState
  ai:            null,   // PlayerState
  waveNum:       1,
  waveTimer:     30,
  incomeTimer:   INCOME_INTERVAL,
  gameOver:      false,
  gameSpeed:     1,
  selectedTower: null,   // { tower, p } | null
  placingTower:  null,   // TowerDef    | null
  aiState:       null,   // see makeAIState() in systems/ai.js
  scene:         null,   // Phaser.Scene — set by GameScene.create()
};

// ─── Player factory ───────────────────────────────────────────────────────────
export function makePlayer(isAI, offsetX) {
  const grid = makeGrid();
  return {
    isAI, offsetX,
    grid,
    towers:     [],
    creeps:     [],
    projectiles:[],
    particles:  [],
    floats:     [],   // active Phaser.GameObjects.Text
    gold:    START_GOLD,
    income:  START_INCOME,
    lives:    20,
    kills:     0,
    spawnQueue: [],
    path: computePath(grid),
  };
}

// ─── Game reset ───────────────────────────────────────────────────────────────
export function initGame() {
  // Destroy any live Phaser Text objects from the previous session
  for (const p of [gameState.player, gameState.ai].filter(Boolean))
    p.floats.forEach(f => f.destroy?.());

  gameState.player        = makePlayer(false, 0);
  gameState.ai            = makePlayer(true, BOARD_W + GUTTER);
  gameState.waveNum       = 1;
  gameState.waveTimer     = 30;
  gameState.incomeTimer   = INCOME_INTERVAL;
  gameState.gameOver      = false;
  gameState.gameSpeed     = 1;
  gameState.selectedTower = null;
  gameState.placingTower  = null;
  gameState.aiState       = makeAIState();
}

// ─── Floating text ────────────────────────────────────────────────────────────
/**
 * Spawn a short-lived world-space text label (e.g. "+10", "-1 ❤️").
 * Requires gameState.scene to be set by the Phaser scene.
 */
export function addFloat(p, x, y, text, color) {
  if (!gameState.scene) return;
  const t = gameState.scene.add
    .text(x, y, text, {
      fontSize:   '12px',
      fontFamily: 'Courier New',
      color,
      fontStyle:  'bold',
    })
    .setOrigin(0.5)
    .setDepth(20);
  t._life = 1.2;
  t._vy   = -40;
  p.floats.push(t);
}

/**
 * Tick all float texts for a player — call from GameScene.update().
 */
export function updateFloats(p, dt) {
  for (const f of p.floats) {
    f._life -= dt;
    f.y     += f._vy * dt;
    f.setAlpha(Math.min(1, Math.max(0, f._life * 2)));
  }
  p.floats = p.floats.filter(f => {
    if (f._life <= 0) { f.destroy(); return false; }
    return true;
  });
}
