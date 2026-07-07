/**
 * ui.js — wires up all HTML buttons to game state and logic.
 * Called from main.js after the Phaser game is created.
 */
import { gameState, addFloat } from './state.js';
import { TOWERS }     from './config/towers.js';
import { SEND_UNITS } from './config/units.js';
import { sellTower }  from './entities/tower.js';
import { sendUnit }   from './systems/waves.js';
import { BOARD_W }    from './config/constants.js';

export function setupUI(phaserGame) {
  _buildTowerButtons();
  _buildSendButtons();
  _buildSellButton();
  _buildSpeedButton();
  _buildRestartButton(phaserGame);
  _buildTooltip();
}

// ─── Tower buttons ────────────────────────────────────────────────────────────
function _buildTowerButtons() {
  const container = document.getElementById('tower-btns');

  Object.values(TOWERS).forEach(def => {
    const btn = document.createElement('button');
    btn.className    = 'btn tower-btn';
    btn.dataset.id   = def.id;
    btn.innerHTML    = `
      <div class="tb-name">${def.name}</div>
      <div class="tb-cost">💰${def.cost}</div>
      <div class="tb-desc">${def.desc}</div>`;
    btn.title = [
      `${def.name} — ${def.desc}`,
      `Cost: ${def.cost}g | Sell: ${def.sell}g`,
      `Range: ${def.range} tiles | Dmg: ${def.damage} | Rate: ${def.rate}/s`,
      def.slow   ? `Slow: ${(def.slow * 100).toFixed(0)}%` : '',
      def.splash  ? `Splash radius: ${def.splash} tiles`   : '',
      '',
      'Click grid to place. Shift+click to keep placing.',
    ].filter(Boolean).join('\n');

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
    btn.className = 'btn send-btn';
    btn.dataset.unlock = def.unlockWave;
    btn.innerHTML = `
      <div class="sb-name">${def.name}</div>
      <div class="sb-cost">💰${def.cost}</div>
      <div class="sb-income">+${def.incomeBonus} income</div>
      <div class="sb-hp">❤️${def.hp}${def.count ? ` ×${def.count}` : ''}</div>`;
    btn.title = [
      `Send ${def.name} into the opponent's lane`,
      def.desc,
      `Cost: ${def.cost}g | HP: ${def.hp} | Speed: ${def.speed}`,
      `Permanently raises YOUR income by ${def.incomeBonus}`,
      def.count ? `Sends ${def.count} units at once` : '',
      def.unlockWave > 1 ? `Unlocks at wave ${def.unlockWave}` : '',
    ].filter(Boolean).join('\n');

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

// ─── Speed button ─────────────────────────────────────────────────────────────
function _buildSpeedButton() {
  const speeds = [1, 2, 3];
  let idx = 0;
  const btn = document.getElementById('speed-btn');
  btn.addEventListener('click', () => {
    idx = (idx + 1) % speeds.length;
    gameState.gameSpeed     = speeds[idx];
    btn.textContent = `Speed: ${speeds[idx]}x`;
  });
}

// ─── Restart button ───────────────────────────────────────────────────────────
function _buildRestartButton(phaserGame) {
  document.getElementById('restart-btn').addEventListener('click', () => {
    // Reset UI state
    gameState.placingTower  = null;
    gameState.selectedTower = null;
    gameState.gameSpeed     = 1;
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('speed-btn').textContent = 'Speed: 1x';

    // Reset game via the scene
    phaserGame.scene.getScene('GameScene').resetGame();
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function _buildTooltip() {
  const tooltip = document.getElementById('tooltip');
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[title]');
    if (!el) return;
    tooltip.textContent = el.title;
    tooltip.style.display = 'block';
  });
  document.addEventListener('mousemove', e => {
    tooltip.style.left = `${e.clientX + 14}px`;
    tooltip.style.top  = `${e.clientY - 8}px`;
  });
  document.addEventListener('mouseout', e => {
    if (!e.target.closest('[title]')) tooltip.style.display = 'none';
  });
}
