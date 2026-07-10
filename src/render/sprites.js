/**
 * sprites.js — the entity view layer.
 *
 * Game logic keeps entities as plain objects in per-player arrays; this
 * module lazily attaches a Phaser sprite to each live entity, syncs it
 * every frame, and retires it (death anim / explosion) when the entity
 * disappears from its array. Anything without a loaded texture falls back
 * to the procedural Graphics drawing in GameScene.
 */
import { CELL } from '../config/constants.js';
import { gameState } from '../state.js';
import { has } from './assets.js';

const views   = new Map(); // entity object → Phaser GameObject
const corpses = [];        // ephemeral death/impact effect sprites

/** Creeps attacking YOUR lane are red; creeps on the AI's lane are blue. */
const laneColor = p => (p.isAI ? 'blue' : 'red');

// ─── Per-frame sync ────────────────────────────────────────────────────────────

export function syncPlayer(scene, p) {
  const live = new Set();

  // Creeps
  for (const c of p.creeps) {
    if (c.hp <= 0) continue;
    const tex = c.sprite ? `${c.sprite.key}-${laneColor(p)}` : null;
    if (!tex || !has(tex)) { c.noSprite = true; continue; }
    live.add(c);

    let s = views.get(c);
    if (!s) {
      s = scene.add.sprite(c.x, c.y, tex)
        .setOrigin(0.5, 0.72)
        .setScale(c.sprite.scale);
      s.play({ key: `${tex}-run`, startFrame: Math.floor(Math.random() * 4) });
      s.tdKind = 'creep';
      s.tdTex  = tex;
      views.set(c, s);
    }
    s.x = c.x;
    s.y = c.y;
    if (Math.abs(c.hx) > 0.1) s.setFlipX(c.hx < 0);
    s.setDepth(c.y);
    s.anims.timeScale = (c.sprite.rate ?? 1) * gameState.gameSpeed * (1 - c.slow * 0.5);
    if (c.flash > 0)      s.setTintFill(0xffffff);
    else if (c.slow > 0)  s.setTint(0x99ccff);
    else                  s.clearTint();
  }

  // Towers
  for (const t of p.towers) {
    const spr = t.def.sprite;
    if (!spr || !has(spr.key)) { t.noSprite = true; continue; }
    live.add(t);

    let s = views.get(t);
    if (!s) {
      const x = p.offsetX + t.col * CELL + CELL / 2;
      const y = (t.row + 1) * CELL;
      s = scene.add.sprite(x, y, spr.key).setOrigin(0.5, 0.94);
      if (spr.anim) s.play(spr.anim);
      if (spr.tint) s.setTint(spr.tint);
      s.tdKind = 'tower';
      views.set(t, s);
    }
    // Single scale write composing build rise, upgrade pop, and fire recoil
    const buildMul  = 1 - (t.buildTime  ?? 0) / 0.35 * 0.4;
    const popMul    = 1 + (t.upgradePop ?? 0) * 0.4;
    const recoilMul = 1 + (t.flash      ?? 0) * 1.5;
    s.setScale((spr.scales[t.tier] ?? spr.scales[0]) * buildMul * popMul * recoilMul);
    s.setDepth((t.row + 1) * CELL);
    // Tint precedence: upgrade white-hot pop > shot flash > permanent def tint
    if ((t.upgradePop ?? 0) > 0.125)      s.setTintFill(0xfff2b0);
    else if (t.flash > 0 && !spr.tint)    s.setTint(0xffffcc);
    else if (spr.tint)                    s.setTint(spr.tint);
    else                                  s.clearTint();
  }

  // Moving projectiles (tracers and chain bolts stay in the Graphics overlay)
  for (const proj of p.projectiles) {
    if (proj.done || proj.instant || proj.chainPts) continue;
    const isFlame = proj.pid === 'flamethrower';
    const tex = isFlame ? 'fire' : 'dynamite';
    if (!has(tex)) continue;
    live.add(proj);

    let s = views.get(proj);
    if (!s) {
      s = scene.add.sprite(proj.x, proj.y, tex).setScale(isFlame ? 0.35 : 0.5);
      s.play(isFlame ? 'fire-anim' : 'dynamite-anim');
      s.tdKind = 'proj';
      s.tdSplash = proj.splash > 0;
      views.set(proj, s);
    }
    s.x = proj.x;
    s.y = proj.y;
    s.setDepth(700);
    if (!isFlame) s.rotation += 0.15 * gameState.gameSpeed;
  }

  return live;
}

/** Retire views whose entity vanished this frame: death anim or explosion. */
export function sweep(scene, liveSets) {
  for (const [entity, s] of views) {
    let alive = false;
    for (const set of liveSets) if (set.has(entity)) { alive = true; break; }
    if (alive) continue;
    views.delete(entity);

    if (s.tdKind === 'creep' && has('dead')) {
      s.setTexture('dead', 0);
      s.clearTint();
      s.setFlipX(false);
      s.anims.timeScale = 1;
      s.play('dead-anim');
      s.life = 0.9;
      corpses.push(s);
    } else if (s.tdKind === 'proj' && s.tdSplash && has('explosion')) {
      s.setTexture('explosion', 0);
      s.setScale(0.55);
      s.rotation = 0;
      s.play('explosion-anim');
      s.setDepth(750);
      s.life = 0.55;
      corpses.push(s);
    } else {
      s.destroy();
    }
  }
}

/**
 * Fire-and-forget effect sprite (e.g. construction dust). Rides the corpses
 * array, which already handles the timed destroy.
 */
export function spawnFx(scene, key, anim, x, y, scale = 1, life = 0.5) {
  if (!scene || !has(key)) return;
  const s = scene.add.sprite(x, y, key).setScale(scale).setDepth(y + 1);
  s.play(anim);
  s.tdKind = 'fx';
  s.life = life;
  corpses.push(s);
}

export function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const s = corpses[i];
    s.life -= dt;
    if (s.tdKind === 'creep') s.setAlpha(Math.min(1, s.life * 2.5));
    if (s.life <= 0) {
      s.destroy();
      corpses.splice(i, 1);
    }
  }
}

/** Destroy every entity sprite. MUST run before initGame() swaps the players. */
export function clearAll() {
  for (const [, s] of views) s.destroy();
  views.clear();
  for (const s of corpses) s.destroy();
  corpses.length = 0;
}
