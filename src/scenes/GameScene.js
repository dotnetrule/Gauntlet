import Phaser from 'phaser';
import {
  COLS, ROWS, CELL,
  BOARD_W, BOARD_H, CANVAS_W, CANVAS_H,
  GUTTER, SPAWN_ROW, SPAWN_COL, EXIT_ROW, EXIT_COL,
} from '../config/constants.js';
import { gameState, initGame, updateFloats } from '../state.js';
import { canPlace, placeTower, sellTower, updateTower } from '../entities/tower.js';
import { updateCreep } from '../entities/creep.js';
import { updateProjectile } from '../entities/projectile.js';
import { startWave, payIncome, processSpawnQueue } from '../systems/waves.js';
import { updateAI } from '../systems/ai.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  preload() {
    // No external assets yet — everything is drawn with Graphics
  }

  create() {
    // Make the scene accessible to entity modules (for Phaser Text creation)
    gameState.scene = this;

    // Single graphics layer — cleared and redrawn every frame
    this.gfx = this.add.graphics();

    // Static board labels (created once, stay on top)
    this.add
      .text(4, 6, 'YOUR LANE', {
        fontSize: '11px', fontFamily: 'Courier New',
        color: '#88ccff', fontStyle: 'bold',
      })
      .setDepth(10);
    this.add
      .text(CANVAS_W - 4, 6, 'AI LANE', {
        fontSize: '11px', fontFamily: 'Courier New',
        color: '#ff8888', fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // ── Input ────────────────────────────────────────────────────────────────
    this.input.mouse.disableContextMenu();
    this._hover = null;

    this.input.on('pointermove', ptr => {
      this._hover = this._cellFromPtr(ptr);
    });

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

    this._render();
  }

  // ─── Public API (called by ui.js) ──────────────────────────────────────────

  resetGame() {
    initGame();
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
      updateFloats(p, dt);

      p.creeps      = p.creeps.filter(c  => c.hp > 0);
      p.projectiles = p.projectiles.filter(pr => !pr.done);
    }
  }

  _checkWinLoss() {
    const { player, ai } = gameState;
    if (player.lives > 0 && ai.lives > 0) return;

    gameState.gameOver = true;
    const win = ai.lives <= 0;

    document.getElementById('overlay-title').textContent = win ? '🏆 Victory!' : '💀 Defeat';
    document.getElementById('overlay-msg').textContent   = win
      ? `You reached wave ${gameState.waveNum - 1} and crushed the AI!`
      : `You fell on wave ${gameState.waveNum - 1}. Better luck next time!`;
    document.getElementById('overlay').style.display = 'flex';
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const { player, ai, waveNum, waveTimer, incomeTimer } = gameState;
    _el('gold-val').textContent    = player.gold;
    _el('income-val').textContent  = `${player.income} (${Math.ceil(incomeTimer)}s)`;
    _el('lives-val').textContent   = player.lives;
    _el('kills-val').textContent   = player.kills;
    _el('ai-gold-val').textContent   = ai.gold;
    _el('ai-income-val').textContent = ai.income;
    _el('ai-lives-val').textContent  = ai.lives;
    _el('ai-kills-val').textContent  = ai.kills;
    _el('wave-timer').textContent  = Math.ceil(waveTimer);
    _el('wave-label').textContent  = `Wave ${waveNum}`;

    this._updateSendLocks();
  }

  /** Grey out send buttons whose unlock wave hasn't been reached yet. */
  _updateSendLocks() {
    for (const btn of document.querySelectorAll('.send-btn')) {
      const locked = gameState.waveNum < Number(btn.dataset.unlock);
      if (btn.disabled !== locked) {
        btn.disabled = locked;
        btn.classList.toggle('locked', locked);
      }
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    const g = this.gfx;
    g.clear();
    this._drawBoard(g, gameState.player, this._hover);
    this._drawGutter(g);
    this._drawBoard(g, gameState.ai, null);
  }

  _drawBoard(g, p, hover) {
    this._drawGrid(g, p, hover);
    p.towers.forEach(t  => this._drawTower(g, p, t));
    p.creeps.forEach(c  => { if (c.hp > 0) this._drawCreep(g, c); });
    p.projectiles.forEach(pr => { if (!pr.done && !pr.instant) this._drawProjectile(g, pr); });
  }

  _drawGrid(g, p, hover) {
    const pathSet = new Set(p.path?.map(([r, c]) => r * COLS + c) ?? []);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = p.offsetX + c * CELL, y = r * CELL;
        g.fillStyle(pathSet.has(r * COLS + c) ? 0x1e2a1e : 0x1a1a2e, 1);
        g.fillRect(x, y, CELL, CELL);
        g.lineStyle(1, 0x252535, 1);
        g.strokeRect(x, y, CELL, CELL);
      }
    }

    // Spawn marker (green square)
    g.fillStyle(0x00ff88, 1);
    g.fillRect(p.offsetX + SPAWN_COL * CELL + 4, SPAWN_ROW * CELL + 4, CELL - 8, CELL - 8);

    // Exit marker (red square)
    g.fillStyle(0xff4444, 1);
    g.fillRect(p.offsetX + EXIT_COL * CELL + 4, EXIT_ROW * CELL + 4, CELL - 8, CELL - 8);

    // Placement preview (player board only)
    if (!p.isAI && hover && gameState.placingTower) {
      const { row, col } = hover;
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const ok = canPlace(p, row, col) && gameState.player.gold >= gameState.placingTower.cost;
        g.fillStyle(ok ? 0x50c850 : 0xc83c3c, 0.25);
        g.fillRect(p.offsetX + col * CELL, row * CELL, CELL, CELL);
        g.lineStyle(1, ok ? 0x50c850 : 0xc83c3c, 0.4);
        g.strokeCircle(
          p.offsetX + col * CELL + CELL / 2,
          row * CELL + CELL / 2,
          gameState.placingTower.range * CELL
        );
      }
    }
  }

  _drawTower(g, p, t) {
    const cx = p.offsetX + t.col * CELL + CELL / 2;
    const cy = t.row * CELL + CELL / 2;
    const r  = CELL / 2 - 3;
    const d  = t.def;

    g.fillStyle(d.cn, 1);
    g.lineStyle(1, 0xffffff, 1);

    switch (d.shape) {
      case 'circle':
        g.fillCircle(cx, cy, r);
        g.strokeCircle(cx, cy, r);
        break;
      case 'diamond':
        g.beginPath();
        g.moveTo(cx, cy - r); g.lineTo(cx + r, cy);
        g.lineTo(cx, cy + r); g.lineTo(cx - r, cy);
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      default: // rect
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.strokeRect(cx - r, cy - r, r * 2, r * 2);
    }

    // Highlight selected tower
    const sel = gameState.selectedTower;
    if (sel && sel.tower === t) {
      g.lineStyle(2, 0xffd700, 1);   g.strokeCircle(cx, cy, CELL / 2 - 1);
      g.lineStyle(1, 0xffd700, 0.25); g.strokeCircle(cx, cy, d.range * CELL);
    }
  }

  _drawCreep(g, c) {
    const r = c.size;
    g.fillStyle(c.cn, 1);
    g.fillCircle(c.x, c.y, r);

    if (c.slow > 0) {
      g.lineStyle(2, 0x88ccff, 1);
      g.strokeCircle(c.x, c.y, r + 2);
    }

    // HP bar
    const bw = r * 2 + 2, bh = 3;
    const bx = c.x - bw / 2, by = c.y - r - 6;
    g.fillStyle(0x333333, 1); g.fillRect(bx, by, bw, bh);
    const ratio = c.hp / c.maxHp;
    g.fillStyle(ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff2222, 1);
    g.fillRect(bx, by, bw * ratio, bh);
  }

  _drawProjectile(g, proj) {
    g.fillStyle(proj.cn, 1);
    g.fillCircle(proj.x, proj.y, 4);
  }

  _drawGutter(g) {
    g.fillStyle(0x111111, 1);
    g.fillRect(BOARD_W, 0, GUTTER, CANVAS_H);
    g.lineStyle(1, 0x333333, 1);
    g.beginPath(); g.moveTo(BOARD_W, 0);        g.lineTo(BOARD_W, CANVAS_H);        g.strokePath();
    g.beginPath(); g.moveTo(BOARD_W + GUTTER, 0); g.lineTo(BOARD_W + GUTTER, CANVAS_H); g.strokePath();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Convert a Phaser pointer to a [row, col] on the PLAYER board. */
  _cellFromPtr(ptr) {
    const x = ptr.x, y = ptr.y;
    if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return null;
    return { row: Math.floor(y / CELL), col: Math.floor(x / CELL) };
  }

  _deselectTowerBtns() {
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
  }
}

// Tiny helper to avoid repeated getElementById
const _el = id => document.getElementById(id);
