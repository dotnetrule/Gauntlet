import { COLS, ROWS, SPAWN_ROW, SPAWN_COL, EXIT_ROW, EXIT_COL } from '../config/constants.js';

/**
 * A* pathfinding on a 2D grid.
 * @param {number[][]} grid  - 0=open, 1=blocked
 * @param {[number,number]} start - [row, col]
 * @param {[number,number]} end   - [row, col]
 * @returns {[number,number][] | null} ordered list of [row,col] or null if blocked
 */
export function astar(grid, start, end) {
  const key  = (r, c) => r * COLS + c;
  const heur = (r, c) => Math.abs(r - end[0]) + Math.abs(c - end[1]);

  const open   = new Map();
  const closed = new Set();
  const g      = new Map();
  const prev   = new Map();

  g.set(key(...start), 0);
  open.set(key(...start), { r: start[0], c: start[1], f: heur(...start) });

  while (open.size > 0) {
    // Pop node with lowest f-score
    let bk = null, bf = Infinity;
    for (const [k, n] of open) if (n.f < bf) { bf = n.f; bk = k; }
    const cur = open.get(bk);
    open.delete(bk);

    if (cur.r === end[0] && cur.c === end[1]) {
      const path = []; let k = bk;
      while (prev.has(k)) { path.unshift(k); k = prev.get(k); }
      path.unshift(key(...start));
      return path.map(k => [Math.floor(k / COLS), k % COLS]);
    }

    closed.add(bk);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid[nr][nc] === 1) continue;
      const nk = key(nr, nc);
      if (closed.has(nk)) continue;
      const ng = (g.get(bk) ?? Infinity) + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        prev.set(nk, bk);
        open.set(nk, { r: nr, c: nc, f: ng + heur(nr, nc) });
      }
    }
  }
  return null;
}

/** Create a fresh empty grid. */
export const makeGrid = () =>
  Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

/** Compute the canonical creep path for a given grid state. */
export const computePath = grid =>
  astar(grid, [SPAWN_ROW, SPAWN_COL], [EXIT_ROW, EXIT_COL]);
