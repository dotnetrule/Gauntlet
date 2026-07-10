import { dealDamage } from './combat.js';
import { burst, MAX_PARTICLES } from '../systems/particles.js';

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
      burst(p, proj.x, proj.y, proj.cn, 8, { speed: 100, life: 0.3 });
      for (const c of p.creeps) {
        if (Math.hypot(c.x - proj.x, c.y - proj.y) <= proj.splash) {
          dealDamage(p, c, proj.damage, proj.slow);
        }
      }
    }
  } else {
    proj.x += (dx / dist) * step;
    proj.y += (dy / dist) * step;

    // Sparse particle trail behind moving projectiles
    proj.trailAcc = (proj.trailAcc ?? 0) + dt;
    if (proj.trailAcc >= 0.03 && p.particles.length < MAX_PARTICLES) {
      proj.trailAcc = 0;
      p.particles.push({
        x: proj.x, y: proj.y,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        life: 0.25, maxLife: 0.25, size: 1.5, color: proj.cn,
      });
    }
  }
}
