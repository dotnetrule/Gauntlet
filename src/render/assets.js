/**
 * assets.js — single source of truth for every Tiny Swords asset the
 * renderer uses: URLs, sheet frame sizes, and animation definitions.
 *
 * Frame conventions (see public/assets/tinyswords/ATTRIBUTION.md):
 * unit sheets are 192×192 frames, row 0 = idle, row 1 = run.
 */

const BASE = 'assets/tinyswords';

// Unit sheet geometry: columns per row + idle/run frame ranges.
const UNIT_LAYOUT = {
  pawn:    { cols: 6, idle: [0, 5],  run: [6, 11]  },
  warrior: { cols: 6, idle: [0, 5],  run: [6, 11]  },
  archer:  { cols: 8, idle: [0, 5],  run: [8, 13]  },
  torch:   { cols: 7, idle: [0, 6],  run: [7, 12]  },
  tnt:     { cols: 7, idle: [0, 6],  run: [7, 12]  },
  barrel:  { cols: 4, idle: [0, 0],  run: [4, 7]   },
};

const UNIT_PATHS = {
  pawn:    c => `Factions/Knights/Troops/Pawn/${c}/Pawn_${c}.png`,
  warrior: c => `Factions/Knights/Troops/Warrior/${c}/Warrior_${c}.png`,
  archer:  c => `Factions/Knights/Troops/Archer/${c}/Archer_${c}.png`,
  torch:   c => `Factions/Goblins/Troops/Torch/${c}/Torch_${c}.png`,
  tnt:     c => `Factions/Goblins/Troops/TNT/${c}/TNT_${c}.png`,
  barrel:  c => `Factions/Goblins/Troops/Barrel/${c}/Barrel_${c}.png`,
};

export const UNIT_COLORS = ['Blue', 'Red'];

/** key → loader entry. type: 'image' | 'sheet' */
const MANIFEST = {
  // ── Terrain ────────────────────────────────────────────────────────────────
  'tiles-sand':  { type: 'sheet', url: 'Terrain/Ground/Tilemap_Sand.png',      fw: 64,  fh: 64  },
  'tiles-grass': { type: 'sheet', url: 'Terrain/Ground/Tilemap_Grass.png',     fw: 64,  fh: 64  },
  'tiles-elev':  { type: 'sheet', url: 'Terrain/Ground/Tilemap_Elevation.png', fw: 64,  fh: 64  },
  water:         { type: 'image', url: 'Terrain/Water/Water.png' },
  foam:          { type: 'sheet', url: 'Terrain/Water/Foam/Foam.png',          fw: 192, fh: 192 },
  'rocks-1':     { type: 'sheet', url: 'Terrain/Water/Rocks/Rocks_01.png',     fw: 128, fh: 128 },
  'rocks-2':     { type: 'sheet', url: 'Terrain/Water/Rocks/Rocks_02.png',     fw: 128, fh: 128 },
  'rocks-3':     { type: 'sheet', url: 'Terrain/Water/Rocks/Rocks_03.png',     fw: 128, fh: 128 },
  tree:          { type: 'sheet', url: 'Resources/Trees/Tree.png',             fw: 192, fh: 192 },
  gold:          { type: 'image', url: 'Resources/Resources/G_Idle.png' },
  sheep:         { type: 'sheet', url: 'Resources/Sheep/HappySheep_Bouncing.png', fw: 128, fh: 128 },

  // ── Buildings (towers) ─────────────────────────────────────────────────────
  'tower-blue':    { type: 'image', url: 'Factions/Knights/Buildings/Tower/Tower_Blue.png' },
  'tower-red':     { type: 'image', url: 'Factions/Knights/Buildings/Tower/Tower_Red.png' },
  'tower-purple':  { type: 'image', url: 'Factions/Knights/Buildings/Tower/Tower_Purple.png' },
  'tower-yellow':  { type: 'image', url: 'Factions/Knights/Buildings/Tower/Tower_Yellow.png' },
  'wood-tower':    { type: 'sheet', url: 'Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Red.png', fw: 256, fh: 192 },
  'castle-blue':   { type: 'image', url: 'Factions/Knights/Buildings/Castle/Castle_Blue.png' },
  'castle-red':    { type: 'image', url: 'Factions/Knights/Buildings/Castle/Castle_Red.png' },
  'house-blue':    { type: 'image', url: 'Factions/Knights/Buildings/House/House_Blue.png' },
  'house-red':     { type: 'image', url: 'Factions/Knights/Buildings/House/House_Red.png' },
  'goblin-house':  { type: 'image', url: 'Factions/Goblins/Buildings/Wood_House/Goblin_House.png' },

  // ── Effects / projectiles ──────────────────────────────────────────────────
  explosion: { type: 'sheet', url: 'Effects/Explosion/Explosions.png', fw: 192, fh: 192 },
  fire:      { type: 'sheet', url: 'Effects/Fire/Fire.png',            fw: 128, fh: 128 },
  dust:      { type: 'sheet', url: 'UI/Extra/Dust_01.png',             fw: 64,  fh: 64  },
  dead:      { type: 'sheet', url: 'Factions/Knights/Troops/Dead/Dead.png', fw: 128, fh: 128 },
  arrow:     { type: 'image', url: 'Factions/Knights/Troops/Archer/Arrow/Arrow.png' },
  dynamite:  { type: 'sheet', url: 'Factions/Goblins/Troops/TNT/Dynamite/Dynamite.png', fw: 64, fh: 64 },
};

// Unit sheets ×2 colors join the manifest under keys like 'pawn-blue'.
for (const [unit, pathFn] of Object.entries(UNIT_PATHS)) {
  for (const color of UNIT_COLORS) {
    MANIFEST[`${unit}-${color.toLowerCase()}`] =
      { type: 'sheet', url: pathFn(color), fw: 192, fh: 192 };
  }
}

const missing = new Set();

/** True if a texture loaded successfully (view layer falls back otherwise). */
export function has(key) {
  return !missing.has(key) && key in MANIFEST;
}

export function preloadAssets(scene) {
  scene.load.on('loaderror', file => missing.add(file.key));
  for (const [key, a] of Object.entries(MANIFEST)) {
    const url = `${BASE}/${a.url}`;
    if (a.type === 'sheet') {
      scene.load.spritesheet(key, url, { frameWidth: a.fw, frameHeight: a.fh });
    } else {
      scene.load.image(key, url);
    }
  }
}

export function registerAnims(scene) {
  const mk = (key, tex, start, end, rate, repeat = -1) => {
    if (!has(tex) || scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(tex, { start, end }),
      frameRate: rate,
      repeat,
    });
  };

  for (const [unit, lay] of Object.entries(UNIT_LAYOUT)) {
    for (const color of UNIT_COLORS) {
      const tex = `${unit}-${color.toLowerCase()}`;
      mk(`${tex}-idle`, tex, lay.idle[0], lay.idle[1], 8);
      mk(`${tex}-run`,  tex, lay.run[0],  lay.run[1],  10);
    }
  }

  mk('dead-anim',      'dead',       0, 6, 10, 0);
  mk('explosion-anim', 'explosion',  0, 8, 18, 0);
  mk('fire-anim',      'fire',       0, 6, 12);
  mk('dust-anim',      'dust',       0, 7, 16, 0);
  mk('foam-anim',      'foam',       0, 7, 7);
  mk('tree-anim',      'tree',       0, 3, 4);
  mk('dynamite-anim',  'dynamite',   0, 5, 14);
  mk('rocks-1-anim',   'rocks-1',    0, 7, 6);
  mk('rocks-2-anim',   'rocks-2',    0, 7, 6);
  mk('rocks-3-anim',   'rocks-3',    0, 7, 6);
  mk('sheep-anim',     'sheep',      0, 5, 8);
  mk('wood-tower-anim','wood-tower', 0, 3, 6);
}
