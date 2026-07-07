import { addFloat } from '../state.js';
import { sfx } from '../systems/sfx.js';
import { burst } from '../systems/particles.js';

/**
 * Apply damage (and optional slow) to a creep.
 * Handles kill rewards (bounty gold only — income comes from sending units).
 */
export function dealDamage(p, creep, dmg, slow = 0) {
  if (creep.hp <= 0) return;

  creep.hp   -= dmg;
  creep.flash = 0.08;
  sfx('hit');

  if (slow > 0) {
    creep.slow      = slow;
    creep.slowTimer = 2;
  }

  if (creep.hp <= 0) {
    p.gold   += creep.reward;
    p.kills  += 1;
    addFloat(p, creep.x, creep.y, `+${creep.reward}`, '#ffd700');
    burst(p, creep.x, creep.y, creep.cn, 10, { speed: 90, life: 0.45 });
    sfx('death');
  }
}
