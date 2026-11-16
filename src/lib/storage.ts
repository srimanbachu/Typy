const KEY = 'typy:best:v1';

// Storage can be missing or throw (private mode, blocked site data); the app works without it.
export function loadBest(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveBest(best: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch {
    /* ignore */
  }
}

export type Placement = { x: number; y: number; scale: number };
const KB_PLACE_KEY = 'typy:kb-place:v1';
export const HOME_PLACEMENT: Placement = { x: 0, y: 0, scale: 1 };

// Where the user last dragged the keyboard (px from its home position) and how big they made it.
export function loadKeyboardPlacement(): Placement {
  try {
    const p = JSON.parse(localStorage.getItem(KB_PLACE_KEY) ?? 'null');
    if ([p?.x, p?.y, p?.scale].every(Number.isFinite) && p.scale > 0) return { x: p.x, y: p.y, scale: p.scale };
  } catch {
    /* ignore */
  }
  return HOME_PLACEMENT;
}

export function saveKeyboardPlacement(p: Placement) {
  try {
    localStorage.setItem(KB_PLACE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// How far along the keyboard's drag/resize hint is: shown a few times at most, never again once used.
export type HintState = { shows: number; learned: boolean };
const KB_HINT_KEY = 'typy:kb-hint:v1';

export function loadHintState(): HintState {
  try {
    const h = JSON.parse(localStorage.getItem(KB_HINT_KEY) ?? 'null');
    if (Number.isFinite(h?.shows) && typeof h?.learned === 'boolean') return { shows: h.shows, learned: h.learned };
  } catch {
    /* ignore */
  }
  return { shows: 0, learned: false };
}

export function saveHintState(h: HintState) {
  try {
    localStorage.setItem(KB_HINT_KEY, JSON.stringify(h));
  } catch {
    /* ignore */
  }
}
