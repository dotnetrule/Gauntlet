import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { setupUI }   from './ui.js';
import { initSfx }   from './systems/sfx.js';
import { CANVAS_W, CANVAS_H } from './config/constants.js';

// ─── Phaser game configuration ────────────────────────────────────────────────
const config = {
  type:   Phaser.AUTO,          // WebGL → Canvas fallback
  parent: 'game-area',          // mount into the HTML div
  width:  CANVAS_W,
  height: CANVAS_H,
  backgroundColor: '#141420',
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
};

initSfx();   // arms the pointerdown audio unlock (browser autoplay policy)

const phaserGame = new Phaser.Game(config);

// Wire up HTML UI once Phaser has booted
phaserGame.events.once('ready', () => {
  setupUI(phaserGame);
});
