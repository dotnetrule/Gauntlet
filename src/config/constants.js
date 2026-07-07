// ─── Grid ────────────────────────────────────────────────────────────────────
export const COLS    = 22;
export const ROWS    = 20;
export const CELL    = 32;           // px per tile

// ─── Derived dimensions ───────────────────────────────────────────────────────
export const BOARD_W  = COLS * CELL; // 704
export const BOARD_H  = ROWS * CELL; // 640
export const GUTTER   = 24;          // gap between the two boards
export const CANVAS_W = BOARD_W * 2 + GUTTER; // 1432
export const CANVAS_H = BOARD_H;               // 640

// ─── Economy ──────────────────────────────────────────────────────────────────
export const INCOME_INTERVAL = 15;   // seconds between income payouts
export const START_INCOME    = 15;   // gold per income tick at game start
export const START_GOLD      = 200;
export const WAVE_INTERVAL   = 30;   // seconds between baseline creep waves

// ─── Special cells ────────────────────────────────────────────────────────────
export const SPAWN_ROW = 0;
export const SPAWN_COL = 0;
export const EXIT_ROW  = ROWS - 1;
export const EXIT_COL  = COLS - 1;
