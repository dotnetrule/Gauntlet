/**
 * icons.js — inline-style helpers that crop frame 0 of a Tiny Swords sheet
 * for use as HTML button/portrait icons (CSS background crop).
 */
const BASE = 'assets/tinyswords';

// cols/rows of each unit sheet (frame 0 = idle pose)
const UNIT_SHEETS = {
  pawn:    { cols: 6, rows: 6, path: c => `Factions/Knights/Troops/Pawn/${c}/Pawn_${c}.png` },
  warrior: { cols: 6, rows: 8, path: c => `Factions/Knights/Troops/Warrior/${c}/Warrior_${c}.png` },
  archer:  { cols: 8, rows: 7, path: c => `Factions/Knights/Troops/Archer/${c}/Archer_${c}.png` },
  torch:   { cols: 7, rows: 5, path: c => `Factions/Goblins/Troops/Torch/${c}/Torch_${c}.png` },
  tnt:     { cols: 7, rows: 3, path: c => `Factions/Goblins/Troops/TNT/${c}/TNT_${c}.png` },
  barrel:  { cols: 4, rows: 4, path: c => `Factions/Goblins/Troops/Barrel/${c}/Barrel_${c}.png` },
};

// tower sprite key → single-frame building image (frame 0 crop for sheets)
const TOWER_ICONS = {
  'tower-blue':   { url: 'Factions/Knights/Buildings/Tower/Tower_Blue.png',   cols: 1 },
  'tower-red':    { url: 'Factions/Knights/Buildings/Tower/Tower_Red.png',    cols: 1 },
  'tower-purple': { url: 'Factions/Knights/Buildings/Tower/Tower_Purple.png', cols: 1 },
  'tower-yellow': { url: 'Factions/Knights/Buildings/Tower/Tower_Yellow.png', cols: 1 },
  'wood-tower':   { url: 'Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Red.png', cols: 4 },
};

/** Style string for a unit's idle pose cropped into a px×px box. */
export function unitIconStyle(key, color = 'Red', px = 44) {
  const s = UNIT_SHEETS[key];
  if (!s) return '';
  // The character occupies the middle of its 192px frame — zoom 2.2× into
  // the frame centre so the icon actually fills the button.
  const z = 2.2;
  const off = (px * z - px) / 2;
  return `background-image:url('${BASE}/${s.path(color)}');` +
         `background-size:${s.cols * px * z}px ${s.rows * px * z}px;` +
         `background-position:${-off}px ${-off * 0.9}px;`;
}

/** Style string for a tower building icon fitted into a w×h box. */
export function towerIconStyle(spriteKey, w = 34, h = 52) {
  const t = TOWER_ICONS[spriteKey];
  if (!t) return '';
  if (t.cols === 1) {
    // Single tall building: fit by height, center horizontally.
    return `background-image:url('${BASE}/${t.url}');` +
           `background-size:auto ${h}px;background-position:center top;`;
  }
  // Sheet (wood tower 256×192 frames): crop frame 0, centered.
  const frameW = h * (256 / 192);
  return `background-image:url('${BASE}/${t.url}');` +
         `background-size:${t.cols * frameW}px ${h}px;` +
         `background-position:${-(frameW - w) / 2}px 0;`;
}

export const GOLD_ICON   = `${BASE}/Resources/Resources/G_Idle.png`;
export const CASTLE_ICON = `${BASE}/Factions/Knights/Buildings/Castle/Castle_Blue.png`;
export const AVATAR_ICON = `${BASE}/UI/Extra/Avatar_03.png`;
