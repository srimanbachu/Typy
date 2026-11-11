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
