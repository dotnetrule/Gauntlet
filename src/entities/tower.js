import { gameState } from '../state.js';
import { astar, computePath } from '../systems/pathfinding.js';
import { dealDamage } from './combat.js';
import { sfx } from '../systems/sfx.js';
import { burst } from '../systems/particles.js';
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
  p.towers.push({ row, col, def, tier: 0, invested: def.cost, cooldown: 0, flash: 0 });
  p.path = computePath(p.grid);
  p.creeps.forEach(c => rerouteCreep(p, c));
  sfx('place');
  return true;
}

/** Effective stats for a tower at its current tier. */
export function towerStats(t) {
  return t.tier === 0 ? t.def : { ...t.def, ...t.def.upgrades[t.tier - 1] };
}

/** Next tier's upgrade def, or null at max tier. */
export function nextUpgrade(t) {
  return t.def.upgrades?.[t.tier] ?? null;
}

/** Upgrade a tower to its next tier. Returns false if maxed or unaffordable. */
export function upgradeTower(p, t) {
  const up = nextUpgrade(t);
  if (!up || p.gold < up.cost) return false;
  p.gold     -= up.cost;
  t.tier     += 1;
  t.invested += up.cost;
  const cx = p.offsetX + t.col * CELL + CELL / 2;
  const cy = t.row * CELL + CELL / 2;
  burst(p, cx, cy, 0xffd700, 12, { speed: 70, life: 0.5 });
  sfx('upgrade');
  return true;
}

/** Remove a tower and refund 50% of everything invested in it. */
export function sellTower(p, tower) {
  p.gold              += Math.floor(tower.invested * 0.5);
  p.grid[tower.row][tower.col] = 0;
  p.towers             = p.towers.filter(t => t !== tower);
  p.path               = computePath(p.grid);
  p.creeps.forEach(c => rerouteCreep(p, c));
  sfx('sell');
}

// ─── Per-frame update ─────────────────────────────────────────────────────────

/** Fire at the furthest-along creep in range, respecting cooldown. */
export function updateTower(p, t, dt) {
  t.cooldown = Math.max(0, t.cooldown - dt);
  t.flash    = Math.max(0, t.flash - dt);
  if (t.cooldown > 0) return;

  const stats = towerStats(t);
  const rng = stats.range * CELL;
  const tx  = p.offsetX + t.col * CELL + CELL / 2;
  const ty  = t.row * CELL + CELL / 2;

  // Find the creep furthest along the path within range
  let best = null, bestIdx = -1;
  for (const c of p.creeps) {
    if (c.hp <= 0 || Math.hypot(c.x - tx, c.y - ty) > rng) continue;
    if (c.pathIndex > bestIdx) { best = c; bestIdx = c.pathIndex; }
  }
  if (!best) return;

  t.cooldown = 1 / stats.rate;
  t.flash    = 0.07;
  sfx(`shot_${t.def.id}`);

  if (stats.chain > 0) {
    // Chain lightning — hit the primary plus its nearest neighbours
    const targets = _chainTargets(p, best, stats.chain);
    const pts = [[tx, ty]];
    for (const c of targets) {
      dealDamage(p, c, stats.damage, stats.slow);
      pts.push([c.x, c.y]);
    }
    p.projectiles.push({
      chainPts: pts, life: 0.15,
      cn: stats.cn, done: false, instant: true,
    });
  } else if (stats.splash > 0) {
    // Projectile that explodes on arrival
    p.projectiles.push({
      x: tx, y: ty, tx: best.x, ty: best.y,
      speed: 280, splash: stats.splash * CELL,
      damage: stats.damage, slow: stats.slow,
      cn: stats.cn, done: false,
    });
  } else {
    // Instant hit — fire a visual-only tracer
    dealDamage(p, best, stats.damage, stats.slow);
    p.projectiles.push({
      x: tx, y: ty, tx: best.x, ty: best.y,
      speed: 450, splash: 0, damage: 0, slow: 0,
      cn: stats.cn, done: false, instant: true,
    });
  }
}

/** Primary target plus up to (chain-1) nearest living creeps within 2 tiles. */
function _chainTargets(p, primary, chain) {
  const near = p.creeps
    .filter(c => c !== primary && c.hp > 0 &&
                 Math.hypot(c.x - primary.x, c.y - primary.y) <= 2 * CELL)
    .sort((a, b) =>
      Math.hypot(a.x - primary.x, a.y - primary.y) -
      Math.hypot(b.x - primary.x, b.y - primary.y));
  return [primary, ...near.slice(0, chain - 1)];
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
