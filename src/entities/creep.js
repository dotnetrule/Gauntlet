import { gameState, addFloat } from '../state.js';
import { computePath } from '../systems/pathfinding.js';
import { sfx } from '../systems/sfx.js';
import { burst } from '../systems/particles.js';
import { CELL, EXIT_COL, EXIT_ROW, SPAWN_COL, SPAWN_ROW } from '../config/constants.js';

/**
 * Spawn a creep from a definition at player p's lane entrance.
 */
export function spawnCreepFromDef(p, def) {
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
    flash: 0,
    age:   Math.random() * 10,   // desyncs the walk wobble between creeps
    hx: 1, hy: 0,                // unit heading for wobble + facing nub
    pathIndex: 1,
    path,
  });
}

/**
 * Advance a single creep along its path.
 * Handles slowing, reaching the exit (life loss), and movement.
 */
export function updateCreep(p, c, dt) {
  c.age  += dt;
  c.flash = Math.max(0, c.flash - dt);

  // Tick slow debuff
  if (c.slowTimer > 0) {
    c.slowTimer -= dt;
    if (c.slowTimer <= 0) c.slow = 0;
  }

  const speed = c.speed * (1 - c.slow);

  // Reached the exit?
  if (c.pathIndex >= c.path.length) {
    const ex = p.offsetX + EXIT_COL * CELL + CELL / 2;
    const ey = EXIT_ROW * CELL + CELL / 2;
    c.hp      = 0;
    p.lives   = Math.max(0, p.lives - 1);
    addFloat(p, ex, EXIT_ROW * CELL, '-1 ❤️', '#ff4444');
    burst(p, ex, ey, 0xff4444, 14, { speed: 110, life: 0.5 });
    sfx('leak');
    if (!p.isAI) gameState.shake = true;   // only shake for the player's pain
    return;
  }

  // Move toward next waypoint
  const [tr, tc] = c.path[c.pathIndex];
  const tx   = p.offsetX + tc * CELL + CELL / 2;
  const ty   = tr * CELL + CELL / 2;
  const dx   = tx - c.x;
  const dy   = ty - c.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;

  if (dist <= step) {
    c.x = tx; c.y = ty;
    c.pathIndex++;
  } else {
    c.hx = dx / dist;
    c.hy = dy / dist;
    c.x += c.hx * step;
    c.y += c.hy * step;
  }
}
