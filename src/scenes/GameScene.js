import Phaser from 'phaser';
import {
  COLS, ROWS, CELL,
  BOARD_W, BOARD_H, CANVAS_W, CANVAS_H,
  GUTTER, WATER_PAD, SPAWN_ROW, SPAWN_COL, EXIT_ROW, EXIT_COL,
} from '../config/constants.js';
import { preloadAssets, registerAnims, has } from '../render/assets.js';
import { buildTerrain, drawPathOverlay, drawBuildGrid } from '../render/board.js';
import { syncPlayer, sweep, updateCorpses, clearAll } from '../render/sprites.js';
import { gameState, initGame, updateFloats } from '../state.js';
import {
  canPlace, placeTower, sellTower, updateTower,
  towerStats, nextUpgrade,
} from '../entities/tower.js';
import { updateCreep } from '../entities/creep.js';
import { updateProjectile } from '../entities/projectile.js';
import { startWave, payIncome, processSpawnQueue } from '../systems/waves.js';
import { updateAI } from '../systems/ai.js';
import { updateParticles } from '../systems/particles.js';
import { sfx } from '../systems/sfx.js';
import { setStat, tickStats, snapStats } from '../render/hud.js';
import { towerIconStyle } from '../render/icons.js';
import { addFloat } from '../state.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  preload() {
    preloadAssets(this);
  }

  create() {
    // Make the scene accessible to entity modules (for Phaser Text creation)
    gameState.scene = this;

    // World (0,0) is the player board's top-left; scroll the camera so a
    // water margin shows around both islands.
    this.cameras.main.setScroll(-WATER_PAD, -WATER_PAD);

    registerAnims(this);
    buildTerrain(this);

    // Dynamic overlay layer (HP bars, range rings, tracers…) above all sprites
    this.gfx = this.add.graphics().setDepth(800);

    // Ghost preview sprite while placing a tower
    this._ghost = this.add.sprite(0, 0, '__DEFAULT').setVisible(false).setDepth(810);

    // Static board labels (created once, stay on top)
    const labelStyle = {
      fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      stroke: '#1a2433', strokeThickness: 3,
    };
    this.add
      .text(BOARD_W / 2, -WATER_PAD + 3, 'YOUR LANE', { ...labelStyle, color: '#9fd4ff' })
      .setOrigin(0.5, 0).setDepth(900);
    this.add
      .text(BOARD_W + GUTTER + BOARD_W / 2, -WATER_PAD + 3, 'AI LANE', { ...labelStyle, color: '#ffb3a7' })
      .setOrigin(0.5, 0).setDepth(900);

    // ── Input ────────────────────────────────────────────────────────────────
    this.input.mouse.disableContextMenu();
    this._hover = null;

    this.input.on('pointermove', ptr => {
      this._hover = this._cellFromPtr(ptr);
    });
    // Clear the hover cell when the pointer leaves the canvas, otherwise the
    // placement ghost sticks to the last hovered cell.
    this.input.on('gameout', () => { this._hover = null; });

    this.input.on('pointerdown', ptr => {
      if (gameState.gameOver || !gameState.player) return;

      // Right-click → cancel placement / deselect
      if (ptr.button === 2) {
        gameState.placingTower  = null;
        gameState.selectedTower = null;
        this._deselectTowerBtns();
        return;
      }

      const cell = this._cellFromPtr(ptr);
      if (!cell) return;

      if (gameState.placingTower) {
        const placed = placeTower(gameState.player, cell.row, cell.col, gameState.placingTower);
        if (placed && !ptr.event.shiftKey) {
          gameState.placingTower = null;
          this._deselectTowerBtns();
        }
      } else {
        // Select / deselect a tower
        const hit = gameState.player.towers.find(
          t => t.row === cell.row && t.col === cell.col
        );
        gameState.selectedTower = hit ? { tower: hit, p: gameState.player } : null;
      }
    });

    // Start a fresh game
    this.resetGame();
  }

  update(_time, delta) {
    if (!gameState.player) return;

    const dt = Math.min(delta / 1000, 0.05) * gameState.gameSpeed;

    if (!gameState.gameOver) {
      this._updateLogic(dt);
      this._checkWinLoss();
      this._updateHUD();
    }

    // HUD count animations run on real time, unaffected by game speed
    tickStats(delta);

    this._render(dt);
  }

  // ─── Public API (called by ui.js) ──────────────────────────────────────────

  resetGame() {
    clearAll();   // destroy entity sprites BEFORE the player objects are swapped
    initGame();
    this._waveWarned = 0;
    document.getElementById('wave-banner').classList.remove('incoming');
    document.getElementById('overlay').classList.remove('show');
    // Retarget the HUD to the fresh values, then snap so nothing counts down
    this._updateHUD();
    snapStats();
  }

  // ─── Logic tick ────────────────────────────────────────────────────────────

  _updateLogic(dt) {
    gameState.waveTimer -= dt;
    if (gameState.waveTimer <= 0) startWave();

    gameState.incomeTimer -= dt;
    if (gameState.incomeTimer <= 0) payIncome();

    processSpawnQueue(gameState.player, dt);
    processSpawnQueue(gameState.ai, dt);
    updateAI(dt);

    for (const p of [gameState.player, gameState.ai]) {
      p.towers.forEach(t  => updateTower(p, t, dt));
      p.creeps.filter(c => c.hp > 0).forEach(c => updateCreep(p, c, dt));
      p.projectiles.forEach(pr => updateProjectile(p, pr, dt));
      updateParticles(p, dt);
      updateFloats(p, dt);

      p.creeps      = p.creeps.filter(c  => c.hp > 0);
      p.projectiles = p.projectiles.filter(pr => !pr.done);
    }

    // Wave-incoming telegraph: warn once per wave when spawn is 3s away
    const banner = _el('wave-banner');
    if (gameState.waveTimer <= 3) {
      if (this._waveWarned !== gameState.waveNum) {
        this._waveWarned = gameState.waveNum;
        banner.classList.add('incoming');
        sfx('warn');
        for (const p of [gameState.player, gameState.ai]) {
          addFloat(p, p.offsetX + SPAWN_COL * CELL + CELL / 2,
                   SPAWN_ROW * CELL + CELL * 1.5,
                   `Wave ${gameState.waveNum} incoming!`, '#ffb08a');
        }
      }
    } else if (banner.classList.contains('incoming')) {
      banner.classList.remove('incoming');
    }

    // Consume one-shot feedback flags set by entity modules
    if (gameState.shake) {
      this.cameras.main.shake(150, 0.004);
      gameState.shake = false;
    }
    if (gameState.leakFlash) {
      this.cameras.main.flash(120, 255, 40, 40);
      gameState.leakFlash = false;
    }
    if (gameState.incomePulse) {
      gameState.incomePulse = false;
      for (const id of ['gold-val', 'income-val']) {
        const el = _el(id);
        el.classList.remove('pulse');
        void el.offsetWidth;   // restart the CSS animation
        el.classList.add('pulse');
      }
    }
  }

  _checkWinLoss() {
    const { player, ai } = gameState;
    if (player.lives > 0 && ai.lives > 0) return;

    gameState.gameOver = true;
    const win = ai.lives <= 0;
    sfx(win ? 'win' : 'lose');

    document.getElementById('overlay-title').textContent = win ? '🏆 Victory!' : '💀 Defeat';
    document.getElementById('overlay-msg').textContent   = win
      ? `You reached wave ${gameState.waveNum - 1} and crushed the AI!`
      : `You fell on wave ${gameState.waveNum - 1}. Better luck next time!`;
    document.getElementById('overlay').classList.add('show');
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const { player, ai, waveNum, waveTimer, incomeTimer } = gameState;
    // Animated stats: hud.js is the ONLY writer for these elements
    setStat('gold-val',   player.gold);
    setStat('income-val', player.income);
    setStat('lives-val',  player.lives);
    setStat('kills-val',  player.kills);
    setStat('sb-lives',  player.lives,  { flash: false });
    setStat('sb-income', player.income, { flash: false });
    setStat('sb-kills',  player.kills,  { flash: false });
    setStat('sb-gold',   player.gold,   { flash: false });
    setStat('ai-gold-val',   ai.gold,   { flash: false });
    setStat('ai-income-val', ai.income, { flash: false });
    setStat('ai-lives-val',  ai.lives,  { flash: false });
    setStat('ai-kills-val',  ai.kills,  { flash: false });
    // Non-animated labels/timers
    _set('income-timer', Math.ceil(incomeTimer));
    _set('wave-timer', Math.ceil(waveTimer));
    _set('wave-label', `Wave ${waveNum}`);

    this._updateCmdButtons();
    this._updateTowerButtons();
    this._updatePortrait();
  }

  /** Portrait box: selected tower stats (with upgrade preview), the def being
   *  placed, or idle text. Also swaps the avatar for the tower's icon. */
  _updatePortrait() {
    const sel = gameState.selectedTower;
    const placing = gameState.placingTower;

    // A stat line, optionally with a green "→ next" delta when upgrading
    const delta = (label, cur, next, suffix = '') =>
      next !== undefined && next !== cur
        ? `${label}: ${cur} <span class="up">→ ${next}</span>${suffix}`
        : `${label}: ${cur}${suffix}`;

    let name, statsHTML, iconKey = null;
    if (sel) {
      const t = sel.tower, s = towerStats(t);
      const up = sel.p === gameState.player ? nextUpgrade(t) : null;
      const n  = up ? { ...s, ...up } : {};
      name    = `${t.def.name} Tower${t.tier > 0 ? ` (Tier ${t.tier + 1})` : ''}`;
      iconKey = t.def.sprite?.key;
      statsHTML = [
        `${delta('Damage', s.damage, n.damage)}   ${delta('Rate', s.rate, n.rate, '/s')}`,
        delta('Range', s.range, n.range, ' tiles'),
        s.slow   ? delta('Slow', `${(s.slow * 100).toFixed(0)}%`, n.slow !== undefined ? `${(n.slow * 100).toFixed(0)}%` : undefined) : '',
        s.splash ? delta('Splash', s.splash, n.splash, ' tiles') : '',
        s.chain  ? delta('Chains to', s.chain, n.chain) : '',
        up ? `<span class="${gameState.player.gold >= up.cost ? 'up' : 'dim'}">Next tier: ${up.cost}g</span>` : '',
        sel.p !== gameState.player ? '<span class="dim">(enemy tower)</span>' : '',
      ].filter(Boolean).join('\n');
    } else if (placing) {
      name      = `Build: ${placing.name}`;
      iconKey   = placing.sprite?.key;
      statsHTML = `${placing.desc}\nCost: ${placing.cost}g — click the grid to place`;
    } else {
      name      = 'Commander';
      statsHTML = 'Select a tower or pick one to build.\nSend units to grow your income.';
    }
    _set('portrait-name', name);

    // innerHTML write, change-guarded (content is config-derived, no user input)
    const statsEl = _el('portrait-stats');
    if (this._lastStatsHTML !== statsHTML) {
      this._lastStatsHTML = statsHTML;
      statsEl.innerHTML = statsHTML;
    }

    // Swap avatar ↔ tower icon
    if (this._lastIconKey !== iconKey) {
      this._lastIconKey = iconKey;
      const icon = _el('portrait-icon'), img = _el('portrait-img');
      if (iconKey) {
        icon.style.cssText = towerIconStyle(iconKey, 68, 68);
        icon.style.display = 'block';
        img.style.display  = 'none';
      } else {
        icon.style.display = 'none';
        img.style.display  = '';
      }
    }
  }

  /** Refresh Upgrade/Sell button labels for the selected tower (DOM writes only on change). */
  _updateTowerButtons() {
    const sel = gameState.selectedTower;
    const mine = sel && sel.p === gameState.player;

    const upBtn = _el('upgrade-btn');
    let upLabel = '', upDisabled = true;
    if (mine) {
      const up = nextUpgrade(sel.tower);
      upLabel    = up ? `Upgrade (${up.cost}g)` : 'MAX TIER';
      upDisabled = !up || gameState.player.gold < up.cost;
    }
    const upDisplay = mine ? '' : 'none';
    if (upBtn.style.display !== upDisplay)   upBtn.style.display = upDisplay;
    if (upBtn.textContent !== upLabel)       upBtn.textContent   = upLabel;
    if (upBtn.disabled !== upDisabled)       upBtn.disabled      = upDisabled;

    const sellBtn   = _el('sell-btn');
    const sellLabel = mine
      ? `Sell (${Math.floor(sel.tower.invested * 0.5)}g)`
      : 'Sell (50%)';
    if (sellBtn.textContent !== sellLabel) sellBtn.textContent = sellLabel;
  }

  /**
   * Live lock/afford states on all command buttons. Class-based (never the
   * disabled attribute — disabled elements don't fire mouseover, which would
   * kill tooltips). Click handlers in ui.js enforce the actual rules.
   */
  _updateCmdButtons() {
    const gold = gameState.player.gold;
    for (const btn of document.querySelectorAll('.cmd-btn')) {
      const locked = btn.dataset.unlock
        ? gameState.waveNum < Number(btn.dataset.unlock)
        : false;
      if (btn.classList.contains('locked') !== locked) {
        btn.classList.toggle('locked', locked);
        if (!locked && btn.dataset.unlock) {
          // One-shot unlock glow
          btn.classList.remove('just-unlocked');
          void btn.offsetWidth;
          btn.classList.add('just-unlocked');
        }
      }
      const broke = !locked && gold < Number(btn.dataset.cost);
      if (btn.classList.contains('cant-afford') !== broke) {
        btn.classList.toggle('cant-afford', broke);
      }
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  _render(dt) {
    const g = this.gfx;
    g.clear();

    // Sync entity sprites, retire the vanished ones (death anims, explosions)
    const liveP  = syncPlayer(this, gameState.player);
    const liveAI = syncPlayer(this, gameState.ai);
    sweep(this, [liveP, liveAI]);
    updateCorpses(dt ?? 0.016);

    for (const p of [gameState.player, gameState.ai]) {
      drawPathOverlay(g, p);
      drawBuildGrid(g, p);
      this._drawMarkers(g, p);
      this._drawOverlay(g, p);
    }
    this._drawHover(g, gameState.player, this._hover);
    this._drawGhost(g, gameState.player, this._hover);
  }

  /** Pre-click affordance: highlight hovered towers/cells, manage the cursor. */
  _drawHover(g, p, hover) {
    let cursor = 'default';
    if (gameState.placingTower) {
      cursor = 'crosshair';   // ghost handles the visuals while placing
    } else if (hover && !gameState.gameOver) {
      const tower = p.towers.find(t => t.row === hover.row && t.col === hover.col);
      const x = p.offsetX + hover.col * CELL, y = hover.row * CELL;
      if (tower) {
        cursor = 'pointer';
        g.lineStyle(2, 0xffd700, 0.35);
        g.strokeCircle(x + CELL / 2, y + CELL / 2, CELL / 2 + 2);
      } else {
        g.lineStyle(1, 0xffffff, 0.08);
        g.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
    if (this._cursor !== cursor) {
      this._cursor = cursor;
      this.input.setDefaultCursor(cursor);
    }
  }

  /** Spawn/exit pulses (subtle — the den/castle sprites carry the visual). */
  _drawMarkers(g, p) {
    // Pulse faster and brighter while a wave is about to spawn
    const urgency = gameState.waveTimer <= 3 ? 1 + (3 - gameState.waveTimer) : 1;
    const pulse = Math.min(1, (0.35 + Math.sin(this.time.now / (400 / urgency)) * 0.15) * urgency);
    g.lineStyle(2, 0x66ff99, pulse);
    g.strokeCircle(p.offsetX + SPAWN_COL * CELL + CELL / 2, SPAWN_ROW * CELL + CELL / 2, CELL * 0.7);
    g.lineStyle(2, 0xff6655, pulse);
    g.strokeCircle(p.offsetX + EXIT_COL * CELL + CELL / 2, EXIT_ROW * CELL + CELL / 2, CELL * 0.7);
  }

  /** Everything dynamic that stays vector: HP bars, rings, tracers, particles. */
  _drawOverlay(g, p) {
    // Towers: selection ring + range, tier pips, muzzle glow, fallback shape
    for (const t of p.towers) {
      const cx = p.offsetX + t.col * CELL + CELL / 2;
      const cy = t.row * CELL + CELL / 2;

      if (t.noSprite) this._drawTowerFallback(g, cx, cy, t);

      if (t.flash > 0) {
        g.fillStyle(0xffffcc, Math.min(0.6, t.flash * 7));
        g.fillCircle(cx, cy - CELL * 0.55, 7);
      }
      for (let i = 0; i < t.tier; i++) {
        g.fillStyle(0xffd700, 1);
        g.fillCircle(cx - 5 + i * 10, cy + CELL / 2 - 4, 2.5);
        g.lineStyle(1, 0x333311, 0.8);
        g.strokeCircle(cx - 5 + i * 10, cy + CELL / 2 - 4, 2.5);
      }
      const sel = gameState.selectedTower;
      if (sel && sel.tower === t) {
        g.lineStyle(2, 0xffd700, 0.9);
        g.strokeCircle(cx, cy, CELL / 2 + 1);
        g.lineStyle(1.5, 0xffd700, 0.3);
        g.strokeCircle(cx, cy, towerStats(t).range * CELL);
      }
    }

    // Creeps: HP bar, slow ring, fallback circle
    for (const c of p.creeps) {
      if (c.hp <= 0) continue;
      if (c.noSprite) this._drawCreepFallback(g, c);

      const bw = 16, bh = 3;
      const bx = c.x - bw / 2, by = c.y - 20;
      g.fillStyle(0x1a1a1a, 0.85); g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      const ratio = c.hp / c.maxHp;
      g.fillStyle(ratio > 0.5 ? 0x44dd44 : ratio > 0.25 ? 0xffaa00 : 0xff2222, 1);
      g.fillRect(bx, by, bw * ratio, bh);
      if (c.slow > 0) {
        g.lineStyle(1.5, 0x88ccff, 0.8);
        g.strokeCircle(c.x, c.y - 6, 10);
      }
    }

    // Tracer / chain projectiles
    for (const proj of p.projectiles) {
      if (proj.done) continue;
      if (proj.chainPts) {
        g.lineStyle(2.5, 0xfff2a0, Math.min(1, (proj.life ?? 0.15) * 8));
        g.beginPath();
        g.moveTo(proj.chainPts[0][0], proj.chainPts[0][1]);
        for (let i = 1; i < proj.chainPts.length; i++) {
          g.lineTo(proj.chainPts[i][0], proj.chainPts[i][1]);
        }
        g.strokePath();
      } else if (proj.instant) {
        // Wide faint pass under the thin bright one — cheap tracer glow
        const a = Math.min(1, (proj.life ?? 0.08) * 10);
        g.lineStyle(4, proj.cn, a * 0.3);
        g.beginPath();
        g.moveTo(proj.x, proj.y - CELL * 0.8);
        g.lineTo(proj.tx, proj.ty);
        g.strokePath();
        g.lineStyle(1.5, proj.cn, a);
        g.beginPath();
        g.moveTo(proj.x, proj.y - CELL * 0.8);
        g.lineTo(proj.tx, proj.ty);
        g.strokePath();
      }
    }

    // Circle particles (bursts)
    for (const pt of p.particles) {
      g.fillStyle(pt.color, Math.max(0, pt.life / pt.maxLife));
      g.fillCircle(pt.x, pt.y, pt.size);
    }
  }

  /** Tower-placement preview: sprite ghost + range ring + cell highlight. */
  _drawGhost(g, p, hover) {
    const def = gameState.placingTower;
    const valid = def && hover &&
      hover.row >= 0 && hover.row < ROWS && hover.col >= 0 && hover.col < COLS;
    if (!valid) {
      this._ghost.setVisible(false);
      return;
    }
    const { row, col } = hover;
    const ok = canPlace(p, row, col) && p.gold >= def.cost;
    const x = p.offsetX + col * CELL, y = row * CELL;

    g.fillStyle(ok ? 0x50c850 : 0xc83c3c, 0.3);
    g.fillRect(x, y, CELL, CELL);
    g.lineStyle(1.5, ok ? 0x50c850 : 0xc83c3c, 0.5);
    g.strokeCircle(x + CELL / 2, y + CELL / 2, def.range * CELL);

    const spr = def.sprite;
    if (spr && has(spr.key)) {
      this._ghost
        .setTexture(spr.key, 0)
        .setOrigin(0.5, 0.94)
        .setScale(spr.scales[0])
        .setPosition(x + CELL / 2, y + CELL)
        .setAlpha(0.6)
        .setTint(ok ? 0xaaffaa : 0xff9999)
        .setVisible(true);
    } else {
      this._ghost.setVisible(false);
    }
  }

  // ─── Procedural fallbacks (used only if a texture failed to load) ───────────

  _drawTowerFallback(g, cx, cy, t) {
    const r = Math.min(CELL / 2 - 1, CELL / 2 - 3 + t.tier * 2);
    g.fillStyle(t.def.cn, 1);
    g.lineStyle(1, 0xffffff, 1);
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.strokeRect(cx - r, cy - r, r * 2, r * 2);
  }

  _drawCreepFallback(g, c) {
    g.fillStyle(c.cn, 1);
    g.fillCircle(c.x, c.y, c.size);
    if (c.flash > 0) {
      g.fillStyle(0xffffff, Math.min(0.8, c.flash * 9));
      g.fillCircle(c.x, c.y, c.size);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Convert a Phaser pointer to a [row, col] on the PLAYER board. */
  _cellFromPtr(ptr) {
    const x = ptr.worldX, y = ptr.worldY;   // camera is scrolled by WATER_PAD
    if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return null;
    return { row: Math.floor(y / CELL), col: Math.floor(x / CELL) };
  }

  _deselectTowerBtns() {
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
  }
}

// Tiny helpers to avoid repeated getElementById / redundant DOM writes
const _el = id => document.getElementById(id);
const _set = (id, val) => {
  const el = _el(id);
  const s = String(val);
  if (el && el.textContent !== s) el.textContent = s;
};
