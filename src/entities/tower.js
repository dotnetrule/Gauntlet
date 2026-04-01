import { gameState } from '../state.js';
import { astar, computePath } from '../systems/pathfinding.js';
import { dealDamage } from './combat.js';
import { COLS, CELL, SPAWN_ROW, SPAWN_COL, EXIT_ROW, EXIT_COL } from '../config/constants.js';

// ─── Placement ────────────────────────────────────────────────────────────────

/**
 * Returns true if placing a tower at [row, col] on player p is legal:
 *   - Cell must be empty
 *   - Must not block spawn or exit
 *   - Must not cut the creep path
 */
export function canPlace(p, row, col) {
  if (p.grid[row]?.[col] !== 0)                        return false;
  if (row === SPAWN_ROW && col === SPAWN_COL)           return false;
  if (row === EXIT_ROW  && col === EXIT_COL)            return false;
  const test = p.grid.map(r => [...r]);
  test[row][col] = 1;
  return astar(test, [SPAWN_ROW, SPAWN_COL], [EXIT_ROW, EXIT_COL]) !== null;
}

/** Place a tower and update the grid + creep paths. Returns false if invalid. */
export function placeTower(p, row, col, def) {
  if (!canPlace(p, row, col) || p.gold < def.cost) return false;
  p.gold          -= def.cost;
  p.grid[row][col] = 1;
  p.towers.push({ row, col, def, cooldown: 0 });
  p.path = computePath(p.grid);
  p.creeps.forEach(c => rerouteCreep(p, c));
  return true;
}

/** Remove a tower and refund 50% of its cost. */
export function sellTower(p, tower) {
  p.gold              += tower.def.sell;
  p.grid[tower.row][tower.col] = 0;
  p.towers             = p.towers.filter(t => t !== tower);
  p.path               = computePath(p.grid);
  p.creeps.forEach(c => rerouteCreep(p, c));
}

// ─── Per-frame update ─────────────────────────────────────────────────────────

/** Fire at the furthest-along creep in range, respecting cooldown. */
export function updateTower(p, t, dt) {
  t.cooldown = Math.max(0, t.cooldown - dt);
  if (t.cooldown > 0) return;

  const rng = t.def.range * CELL;
  const tx  = p.offsetX + t.col * CELL + CELL / 2;
  const ty  = t.row * CELL + CELL / 2;

  // Find the creep furthest along the path within range
  let best = null, bestIdx = -1;
  for (const c of p.creeps) {
    if (c.hp <= 0 || Math.hypot(c.x - tx, c.y - ty) > rng) continue;
    if (c.pathIndex > bestIdx) { best = c; bestIdx = c.pathIndex; }
  }
  if (!best) return;

  t.cooldown = 1 / t.def.rate;

  if (t.def.splash > 0) {
    // Projectile that explodes on arrival
    p.projectiles.push({
      x: tx, y: ty, tx: best.x, ty: best.y,
      speed: 280, splash: t.def.splash * CELL,
      damage: t.def.damage, slow: t.def.slow,
      cn: t.def.cn, done: false,
    });
  } else {
    // Instant hit — fire a visual-only tracer
    dealDamage(p, best, t.def.damage, t.def.slow);
    p.projectiles.push({
      x: tx, y: ty, tx: best.x, ty: best.y,
      speed: 450, splash: 0, damage: 0, slow: 0,
      cn: t.def.cn, done: false, instant: true,
    });
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function rerouteCreep(p, c) {
  const np = computePath(p.grid);
  if (!np) return;
  let best = 0, bd = Infinity;
  np.forEach(([r, col], i) => {
    const wx = p.offsetX + col * CELL + CELL / 2;
    const wy = r * CELL + CELL / 2;
    const d  = Math.hypot(c.x - wx, c.y - wy);
    if (d < bd) { bd = d; best = i; }
  });
  c.path      = np;
  c.pathIndex = Math.min(best + 1, np.length - 1);
}
