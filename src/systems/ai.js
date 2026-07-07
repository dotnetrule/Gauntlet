import { gameState, addFloat } from '../state.js';
import { TOWERS } from '../config/towers.js';
import { SEND_UNITS } from '../config/units.js';
import { placeTower } from '../entities/tower.js';
import { sendUnit } from './waves.js';
import { ROWS, COLS, BOARD_W } from '../config/constants.js';

/**
 * Tick the AI — called every frame.
 * The AI has two behaviours on cooldowns:
 *   1. Build towers randomly in valid cells.
 *   2. Send units to the player's lane.
 */
export function updateAI(dt) {
  const { ai, player } = gameState;
  const s = gameState.aiState;

  s.buildTimer -= dt;
  s.sendTimer  -= dt;

  // ── Build ──────────────────────────────────────────────────────────────────
  if (s.buildTimer <= 0) {
    s.buildTimer = 4 + Math.random() * 5;

    const affordable = Object.values(TOWERS).filter(t => t.cost <= ai.gold * 0.7);
    if (affordable.length) {
      const def = affordable[Math.floor(Math.random() * affordable.length)];
      for (let attempt = 0; attempt < 25; attempt++) {
        const row = Math.floor(Math.random() * ROWS);
        const col = 1 + Math.floor(Math.random() * (COLS - 2));
        if (placeTower(ai, row, col, def)) break;
      }
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  if (s.sendTimer <= 0) {
    s.sendTimer = 18 + Math.random() * 10;

    const affordable = Object.values(SEND_UNITS).filter(
      u => u.cost <= ai.gold * 0.5 && gameState.waveNum >= u.unlockWave
    );
    if (affordable.length) {
      const def = affordable[Math.floor(Math.random() * affordable.length)];
      if (ai.gold >= def.cost) {
        ai.gold -= def.cost;
        sendUnit(ai, player, def, def.count ?? 1);
        addFloat(ai, ai.offsetX + BOARD_W / 2, 55, `Sent ${def.name}!`, '#ffa0a0');
      }
    }
  }
}
