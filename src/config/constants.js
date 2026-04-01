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

// ─── Special cells ────────────────────────────────────────────────────────────
export const SPAWN_ROW = 0;
export const SPAWN_COL = 0;
export const EXIT_ROW  = ROWS - 1;
export const EXIT_COL  = COLS - 1;
