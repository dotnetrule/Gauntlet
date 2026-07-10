/**
 * particles.js — tiny world-space particle bursts drawn by GameScene.
 * Leaf module: no game imports, operates on the per-player `particles` array.
 */

export const MAX_PARTICLES = 300;   // per player

/**
 * Spawn a radial burst at (x, y).
 * opts: speed (px/s), life (s), size (px)
 */
export function burst(p, x, y, color, count = 8, opts = {}) {
  const { speed = 80, life = 0.4, size = 2 } = opts;
  for (let i = 0; i < count; i++) {
    if (p.particles.length >= MAX_PARTICLES) return;
    const ang = Math.random() * Math.PI * 2;
    const spd = speed * (0.4 + Math.random() * 0.6);
    p.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      size, color,
    });
  }
}

export function updateParticles(p, dt) {
  for (const pt of p.particles) {
    pt.life -= dt;
    pt.x    += pt.vx * dt;
    pt.y    += pt.vy * dt;
    pt.vx   *= 1 - 2 * dt;   // drag
    pt.vy   *= 1 - 2 * dt;
  }
  p.particles = p.particles.filter(pt => pt.life > 0);
}
