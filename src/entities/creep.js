import { addFloat } from '../state.js';
import { CELL, EXIT_COL, EXIT_ROW } from '../config/constants.js';

/**
 * Advance a single creep along its path.
 * Handles slowing, reaching the exit (life loss), and movement.
 */
export function updateCreep(p, c, dt) {
  // Tick slow debuff
  if (c.slowTimer > 0) {
    c.slowTimer -= dt;
    if (c.slowTimer <= 0) c.slow = 0;
  }

  const speed = c.speed * (1 - c.slow);

  // Reached the exit?
  if (c.pathIndex >= c.path.length) {
    c.hp      = 0;
    p.lives   = Math.max(0, p.lives - 1);
    addFloat(p, p.offsetX + EXIT_COL * CELL + CELL / 2, EXIT_ROW * CELL, '-1 ❤️', '#ff4444');
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
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
  }
}
