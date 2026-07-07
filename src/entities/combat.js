import { addFloat } from '../state.js';

/**
 * Apply damage (and optional slow) to a creep.
 * Handles kill rewards (bounty gold only — income comes from sending units).
 */
export function dealDamage(p, creep, dmg, slow = 0) {
  if (creep.hp <= 0) return;

  creep.hp -= dmg;

  if (slow > 0) {
    creep.slow      = slow;
    creep.slowTimer = 2;
  }

  if (creep.hp <= 0) {
    p.gold   += creep.reward;
    p.kills  += 1;
    addFloat(p, creep.x, creep.y, `+${creep.reward}`, '#ffd700');
  }
}
