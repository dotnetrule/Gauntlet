/**
 * hud.js — animated HUD stat numbers.
 *
 * GameScene._updateHUD rewrites textContent every frame, so a naive tween
 * would be clobbered. Instead this module is the ONLY writer for animated
 * stat elements: setStat() retargets, tickStats() eases the shown value
 * toward the target once per frame and does the single DOM write.
 */

const stats = new Map(); // id → { el, target, shown, flashUp }

function _entry(id) {
  let s = stats.get(id);
  if (!s) {
    const el = document.getElementById(id);
    if (!el) return null;
    const start = Number(el.textContent) || 0;
    s = { el, target: start, shown: start };
    stats.set(id, s);
  }
  return s;
}

/**
 * Retarget an animated stat. Flashes green on increase, red on decrease.
 * Pass flash: false to retarget silently (e.g. AI columns).
 */
export function setStat(id, value, { flash = true } = {}) {
  const s = _entry(id);
  if (!s || s.target === value) return;
  const up = value > s.target;
  s.target = value;
  if (flash) {
    s.el.classList.remove('flash-up', 'flash-down');
    void s.el.offsetWidth; // restart the CSS animation
    s.el.classList.add(up ? 'flash-up' : 'flash-down');
  }
}

/**
 * Ease every shown value toward its target and write the DOM.
 * Call once per frame with REAL milliseconds (not gameSpeed-scaled).
 */
export function tickStats(deltaMs) {
  const k = Math.min(1, (deltaMs / 1000) * 10);
  for (const s of stats.values()) {
    if (s.shown === s.target) continue;
    const diff = s.target - s.shown;
    s.shown = Math.abs(diff) < 1 ? s.target : s.shown + diff * k;
    const text = String(Math.round(s.shown));
    if (s.el.textContent !== text) s.el.textContent = text;
  }
}

/** Snap all shown values to their targets (call on game reset). */
export function snapStats() {
  for (const s of stats.values()) {
    s.shown = s.target;
    const text = String(Math.round(s.shown));
    if (s.el.textContent !== text) s.el.textContent = text;
    s.el.classList.remove('flash-up', 'flash-down');
  }
}
