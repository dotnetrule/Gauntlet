/**
 * ui.js — wires up all HTML buttons to game state and logic.
 * Called from main.js after the Phaser game is created.
 */
import { gameState, addFloat } from './state.js';
import { TOWERS }     from './config/towers.js';
import { SEND_UNITS } from './config/units.js';
import { sellTower, upgradeTower } from './entities/tower.js';
import { sendUnit }   from './systems/waves.js';
import { BOARD_W }    from './config/constants.js';
import { unitIconStyle, towerIconStyle } from './render/icons.js';
import { sfx } from './systems/sfx.js';

export function setupUI(phaserGame) {
  _buildTowerButtons();
  _buildSendButtons();
  _buildSellButton();
  _buildUpgradeButton();
  _buildSpeedButton();
  _buildRestartButton(phaserGame);
  _buildTooltip();
  _buildClickSfx();
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Structured parchment tooltip HTML: bold header, body lines, gold cost, italic hint. */
function tooltipHTML({ head, cost, lines, hint }) {
  return [
    `<span class="tt-head">${esc(head)}</span>`,
    cost ? `<span class="tt-cost">Cost: ${esc(cost)}</span><br>` : '',
    lines.filter(Boolean).map(esc).join('<br>'),
    hint ? `<span class="tt-hint">${esc(hint)}</span>` : '',
  ].join('');
}

// ─── Tower buttons ────────────────────────────────────────────────────────────
function _buildTowerButtons() {
  const container = document.getElementById('tower-btns');

  Object.values(TOWERS).forEach(def => {
    const btn = document.createElement('button');
    btn.className    = 'cmd-btn tower-btn';
    btn.dataset.id   = def.id;
    btn.dataset.cost = def.cost;
    btn.innerHTML    = `
      <div class="cmd-icon" style="${towerIconStyle(def.sprite?.key, 44, 44)}"></div>
      <div class="cmd-name">${def.name}</div>
      <div class="cmd-cost">${def.cost}g</div>`;
    btn.dataset.tt = tooltipHTML({
      head: `${def.name} Tower`,
      cost: `${def.cost}g (sells for 50%)`,
      lines: [
        def.desc,
        `Range: ${def.range} tiles | Dmg: ${def.damage} | Rate: ${def.rate}/s`,
        def.slow    ? `Slow: ${(def.slow * 100).toFixed(0)}%` : '',
        def.splash  ? `Splash radius: ${def.splash} tiles`    : '',
        def.chain   ? `Chains to ${def.chain} creeps`         : '',
        def.upgrades ? `Upgrades: ${def.upgrades.map(u => `${u.cost}g`).join(' → ')}` : '',
      ],
      hint: 'Click grid to place. Shift+click to keep placing.',
    });

    btn.addEventListener('click', () => {
      if (gameState.placingTower === def) {
        // Toggle off
        gameState.placingTower = null;
        btn.classList.remove('selected');
        return;
      }
      gameState.placingTower  = def;
      gameState.selectedTower = null;
      document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });

    container.appendChild(btn);
  });
}

// ─── Send-unit buttons ────────────────────────────────────────────────────────
function _buildSendButtons() {
  const container = document.getElementById('send-btns');

  Object.values(SEND_UNITS).forEach(def => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn send-btn';
    btn.dataset.unlock = def.unlockWave;
    btn.dataset.cost   = def.cost;
    btn.innerHTML = `
      <div class="cmd-icon" style="${unitIconStyle(def.sprite?.key, 'Red', 44)}"></div>
      <div class="cmd-name">${def.name}${def.count ? ` ×${def.count}` : ''}</div>
      <div class="cmd-cost">${def.cost}g</div>
      <div class="cmd-badge">+${def.incomeBonus}</div>
      <div class="cmd-lock"></div>`;
    btn.dataset.tt = tooltipHTML({
      head: `Send ${def.name}`,
      cost: `${def.cost}g`,
      lines: [
        def.desc,
        `HP: ${def.hp} | Speed: ${def.speed}`,
        `Permanently raises YOUR income by ${def.incomeBonus}`,
        def.count ? `Sends ${def.count} units at once` : '',
        def.unlockWave > 1 ? `Unlocks at wave ${def.unlockWave}` : '',
      ],
      hint: "Marches down the opponent's lane.",
    });

    btn.addEventListener('click', () => {
      if (!gameState.player || gameState.gameOver) return;
      if (gameState.waveNum < def.unlockWave) return;
      if (gameState.player.gold < def.cost) {
        addFloat(gameState.player, BOARD_W / 2, 60, 'Not enough gold!', '#ff4444');
        return;
      }
      gameState.player.gold -= def.cost;
      sendUnit(gameState.player, gameState.ai, def, def.count ?? 1);
      addFloat(gameState.player, BOARD_W / 2, 48, `Sent ${def.name}!`, '#ffa0a0');
    });

    container.appendChild(btn);
  });
}

// ─── Sell button ──────────────────────────────────────────────────────────────
function _buildSellButton() {
  document.getElementById('sell-btn').addEventListener('click', () => {
    const sel = gameState.selectedTower;
    if (sel && sel.p === gameState.player) {
      sellTower(gameState.player, sel.tower);
      gameState.selectedTower = null;
    }
  });
}

// ─── Upgrade button ───────────────────────────────────────────────────────────
function _buildUpgradeButton() {
  document.getElementById('upgrade-btn').addEventListener('click', () => {
    const sel = gameState.selectedTower;
    if (sel && sel.p === gameState.player) {
      upgradeTower(gameState.player, sel.tower);
    }
  });
}

// ─── Speed button ─────────────────────────────────────────────────────────────
const SPEED_GLYPHS = { 1: '▶', 2: '▶▶', 3: '▶▶▶' };

function setSpeedButton(speed) {
  const btn = document.getElementById('speed-btn');
  btn.textContent = `${SPEED_GLYPHS[speed]} ${speed}x`;
  btn.className = `wc3-btn speed-${speed}`;
}

function _buildSpeedButton() {
  const speeds = [1, 2, 3];
  let idx = 0;
  setSpeedButton(speeds[idx]);
  document.getElementById('speed-btn').addEventListener('click', () => {
    idx = (idx + 1) % speeds.length;
    gameState.gameSpeed = speeds[idx];
    setSpeedButton(speeds[idx]);
  });

  // Restart resets gameSpeed to 1 — keep the button in sync
  _resetSpeedIdx = () => { idx = 0; setSpeedButton(1); };
}
let _resetSpeedIdx = () => {};

// ─── Restart button ───────────────────────────────────────────────────────────
function _buildRestartButton(phaserGame) {
  document.getElementById('restart-btn').addEventListener('click', () => {
    // Reset UI state
    gameState.placingTower  = null;
    gameState.selectedTower = null;
    gameState.gameSpeed     = 1;
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    _resetSpeedIdx();
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('wave-banner').classList.remove('incoming');

    // Reset game via the scene (also re-syncs and snaps the HUD)
    phaserGame.scene.getScene('GameScene').resetGame();
  });
}

// ─── Click feedback sound ─────────────────────────────────────────────────────
function _buildClickSfx() {
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.cmd-btn, .wc3-btn')) sfx('click');
  }, { passive: true });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Content lives in data-tt (not title — the native browser tooltip would
// double up, and [disabled] elements wouldn't fire mouseover anyway).
function _buildTooltip() {
  const tooltip = document.getElementById('tooltip');
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tt]');
    if (!el) return;
    tooltip.innerHTML = el.dataset.tt;
    tooltip.classList.add('show');
  });
  document.addEventListener('mousemove', e => {
    if (!tooltip.classList.contains('show')) return;
    const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    tooltip.style.left = `${Math.min(e.clientX + 14, window.innerWidth  - w - 8)}px`;
    tooltip.style.top  = `${Math.min(e.clientY - 8,  window.innerHeight - h - 8)}px`;
  });
  document.addEventListener('mouseout', e => {
    const from = e.target.closest?.('[data-tt]');
    if (!from) return;
    // Hide only when the pointer actually left the tooltipped element
    if (e.relatedTarget?.closest?.('[data-tt]') !== from) tooltip.classList.remove('show');
  });
}
