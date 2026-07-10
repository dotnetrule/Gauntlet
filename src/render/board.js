/**
 * board.js — static terrain: teal water, two icy tile islands, foam,
 * trees in the divider channel, and the spawn den / exit castle per board.
 *
 * Everything static is baked into one RenderTexture; the only live objects
 * are a capped set of looping decoration sprites (foam, trees, rocks, sheep).
 */
import {
  COLS, ROWS, CELL, BOARD_W, BOARD_H, GUTTER, WATER_PAD,
  SPAWN_ROW, SPAWN_COL, EXIT_ROW, EXIT_COL,
} from '../config/constants.js';
import { gameState } from '../state.js';
import { has } from './assets.js';

// Icy wash over the sand tiles — two shades give a subtle checker.
const TINT_A = 0xbfd8ee;
const TINT_B = 0xaac6e2;
const ICE_WASH = 0x9cc8f0;   // translucent overlay that cools the whole island

// Sand tilemap is a 5-column sheet; 3×3 island block at the top-left.
const T = { tl: 0, tm: 1, tr: 2, ml: 5, mc: 6, mr: 7, bl: 10, bm: 11, br: 12 };

function edgeTile(r, c) {
  if (r === 0)        return c === 0 ? T.tl : c === COLS - 1 ? T.tr : T.tm;
  if (r === ROWS - 1) return c === 0 ? T.bl : c === COLS - 1 ? T.br : T.bm;
  return c === 0 ? T.ml : c === COLS - 1 ? T.mr : T.mc;
}

export function buildTerrain(scene) {
  const worldL = -WATER_PAD;
  const worldT = -WATER_PAD;
  const worldW = BOARD_W * 2 + GUTTER + WATER_PAD * 2;
  const worldH = BOARD_H + WATER_PAD * 2;

  // ── Water backdrop ──────────────────────────────────────────────────────────
  if (has('water')) {
    scene.add.tileSprite(worldL, worldT, worldW, worldH, 'water')
      .setOrigin(0, 0).setDepth(-30);
  } else {
    scene.add.rectangle(worldL, worldT, worldW, worldH, 0x47aba9)
      .setOrigin(0, 0).setDepth(-30);
  }

  // ── Foam around each island (animated, under the ground layer) ─────────────
  if (has('foam')) {
    for (const offsetX of [0, BOARD_W + GUTTER]) {
      const edges = [];
      for (let c = 0; c < COLS; c += 3) {
        edges.push([offsetX + c * CELL + CELL / 2, CELL / 2]);
        edges.push([offsetX + c * CELL + CELL / 2, BOARD_H - CELL / 2]);
      }
      for (let r = 0; r < ROWS; r += 3) {
        edges.push([offsetX + CELL / 2, r * CELL + CELL / 2]);
        edges.push([offsetX + BOARD_W - CELL / 2, r * CELL + CELL / 2]);
      }
      for (const [x, y] of edges) {
        const f = scene.add.sprite(x, y, 'foam').setScale(0.5).setDepth(-25);
        f.play({ key: 'foam-anim', startFrame: Math.floor(Math.random() * 8) });
      }
    }
  }

  // ── Ground: bake both islands into one RenderTexture ───────────────────────
  const useTiles = has('tiles-sand');
  const rt = scene.add.renderTexture(worldL, worldT, worldW, worldH)
    .setOrigin(0, 0).setDepth(-20);

  if (useTiles) {
    const stamp = scene.make.image({ key: 'tiles-sand', add: false })
      .setOrigin(0, 0).setScale(0.5);
    rt.beginDraw();
    for (const offsetX of [0, BOARD_W + GUTTER]) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          stamp.setFrame(edgeTile(r, c));
          stamp.setTint((r + c) % 2 === 0 ? TINT_A : TINT_B);
          rt.batchDraw(stamp, WATER_PAD + offsetX + c * CELL, WATER_PAD + r * CELL);
        }
      }
    }
    rt.endDraw();
    stamp.destroy();

    // Cool the tan sand toward pale ice — tinting alone can't add blue.
    const wash = scene.make.graphics({ add: false });
    for (const offsetX of [0, BOARD_W + GUTTER]) {
      wash.fillStyle(ICE_WASH, 0.42);
      wash.fillRect(WATER_PAD + offsetX, WATER_PAD, BOARD_W, BOARD_H);
    }
    rt.draw(wash);
    wash.destroy();
  } else {
    // Fallback: flat icy rectangles
    const g = scene.make.graphics({ add: false });
    for (const offsetX of [0, BOARD_W + GUTTER]) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          g.fillStyle((r + c) % 2 === 0 ? 0xbdd2e8 : 0xafc6de, 1);
          g.fillRect(WATER_PAD + offsetX + c * CELL, WATER_PAD + r * CELL, CELL, CELL);
        }
      }
    }
    rt.draw(g);
    g.destroy();
  }

  // ── Decorations ─────────────────────────────────────────────────────────────
  const gutterX = BOARD_W + GUTTER / 2;
  if (has('tree')) {
    for (const y of [70, 200, 330, 460, 590]) {
      const t = scene.add.sprite(gutterX, y, 'tree')
        .setOrigin(0.5, 0.72).setScale(0.5).setDepth(y);
      t.play({ key: 'tree-anim', startFrame: Math.floor(Math.random() * 4) });
    }
  }
  for (const [key, x, y] of [
    ['rocks-1', gutterX - 8, 130],
    ['rocks-2', gutterX + 6, 400],
    ['rocks-3', gutterX - 6, 525],
  ]) {
    if (!has(key)) continue;
    const r = scene.add.sprite(x, y, key).setScale(0.4).setDepth(-24);
    r.play({ key: `${key}-anim`, startFrame: Math.floor(Math.random() * 8) });
  }
  if (has('sheep')) {
    scene.add.sprite(gutterX, 270, 'sheep').setScale(0.4).setDepth(270)
      .play('sheep-anim');
  }

  // ── Spawn den + exit castle per board ───────────────────────────────────────
  for (const p of [{ off: 0, ai: false }, { off: BOARD_W + GUTTER, ai: true }]) {
    const sx = p.off + SPAWN_COL * CELL + CELL / 2;
    const sy = SPAWN_ROW * CELL + CELL;
    const ex = p.off + EXIT_COL * CELL + CELL / 2;
    const ey = EXIT_ROW * CELL + CELL;
    if (has('goblin-house')) {
      scene.add.image(sx, sy + 2, 'goblin-house')
        .setOrigin(0.5, 0.9).setScale(0.3).setDepth(sy - CELL + 2);
    }
    const castle = p.ai ? 'castle-red' : 'castle-blue';
    if (has(castle)) {
      scene.add.image(ex, ey + 4, castle)
        .setOrigin(0.5, 0.92).setScale(0.3).setDepth(ey + 4);
    }
  }
}

// ─── Per-frame overlays (dynamic — drawn into the shared Graphics) ────────────

const pathCache = new WeakMap(); // player → { sig, cells:Set }

/** Trampled-snow trail over the creep path (recomputed only when it changes). */
export function drawPathOverlay(g, p) {
  if (!p.path) return;
  let entry = pathCache.get(p);
  const sig = p.path.length + ':' + p.path.map(([r, c]) => r * COLS + c).join(',');
  if (!entry || entry.sig !== sig) {
    entry = { sig, cells: p.path.map(([r, c]) => r * COLS + c) };
    pathCache.set(p, entry);
  }
  g.fillStyle(0x86b8e8, 0.22);
  for (const idx of entry.cells) {
    const r = (idx / COLS) | 0, c = idx % COLS;
    g.fillRect(p.offsetX + c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
  }
}

/** WC3-style build grid, shown only while placing a tower (player board). */
export function drawBuildGrid(g, p) {
  if (!gameState.placingTower || p.isAI) return;
  g.lineStyle(1, 0x3a5a7a, 0.35);
  for (let r = 1; r < ROWS; r++) {
    g.beginPath();
    g.moveTo(p.offsetX, r * CELL);
    g.lineTo(p.offsetX + BOARD_W, r * CELL);
    g.strokePath();
  }
  for (let c = 1; c < COLS; c++) {
    g.beginPath();
    g.moveTo(p.offsetX + c * CELL, 0);
    g.lineTo(p.offsetX + c * CELL, BOARD_H);
    g.strokePath();
  }
}
