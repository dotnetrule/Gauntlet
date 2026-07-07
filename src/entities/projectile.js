import { dealDamage } from './combat.js';

/**
 * Advance a projectile toward its target position.
 * On arrival: splash projectiles deal AoE damage.
 * Instant tracers and chain bolts are visual-only and fade on a short timer.
 */
export function updateProjectile(p, proj, dt) {
  if (proj.done) return;

  // Visual-only effects (tracers, chain bolts) — expire on a timer
  if (proj.instant) {
    proj.life = (proj.life ?? 0.08) - dt;
    if (proj.life <= 0) proj.done = true;
    return;
  }

  const dx   = proj.tx - proj.x;
  const dy   = proj.ty - proj.y;
  const dist = Math.hypot(dx, dy);
  const step = proj.speed * dt;

  if (dist <= step) {
    proj.x = proj.tx;
    proj.y = proj.ty;
    proj.done = true;

    if (proj.splash > 0 && proj.damage > 0) {
      // AoE — hit every creep within splash radius
      for (const c of p.creeps) {
        if (Math.hypot(c.x - proj.x, c.y - proj.y) <= proj.splash) {
          dealDamage(p, c, proj.damage, proj.slow);
        }
      }
    }
  } else {
    proj.x += (dx / dist) * step;
    proj.y += (dy / dist) * step;
  }
}
