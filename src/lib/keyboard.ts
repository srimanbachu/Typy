export type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'lt' | 'rt';

export const FINGER_NAMES: Record<Finger, string> = {
  lp: 'Left pinky',
  lr: 'Left ring',
  lm: 'Left middle',
  li: 'Left index',
  ri: 'Right index',
  rm: 'Right middle',
  rr: 'Right ring',
  rp: 'Right pinky',
  lt: 'Left thumb',
  rt: 'Right thumb',
};

export type KeyDef = {
  /** KeyboardEvent.code */
  code: string;
  label: string;
  /** Shifted legend shown above the main one (numbers and symbols). */
  shift?: string;
  /** Width in key units. */
  w: number;
  finger: Finger | null;
  /** Modifier-style legend: small and left/right aligned. */
  mod?: 'left' | 'right';
  x: number;
  y: number;
};

type Row = [code: string, label: string, w?: number, shift?: string, mod?: 'left' | 'right'][];

const ROWS: Row[] = [
  [
    ['Backquote', '`', 1, '~'], ['Digit1', '1', 1, '!'], ['Digit2', '2', 1, '@'], ['Digit3', '3', 1, '#'],
    ['Digit4', '4', 1, '$'], ['Digit5', '5', 1, '%'], ['Digit6', '6', 1, '^'], ['Digit7', '7', 1, '&'],
    ['Digit8', '8', 1, '*'], ['Digit9', '9', 1, '('], ['Digit0', '0', 1, ')'], ['Minus', '-', 1, '_'],
    ['Equal', '=', 1, '+'], ['Backspace', 'delete', 2, undefined, 'right'],
  ],
  [
    ['Tab', 'tab', 1.5, undefined, 'left'], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'],
    ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'],
    ['BracketLeft', '[', 1, '{'], ['BracketRight', ']', 1, '}'], ['Backslash', '\\', 1.5, '|'],
  ],
  [
    ['CapsLock', 'caps lock', 1.75, undefined, 'left'], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'],
    ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'],
    ['Semicolon', ';', 1, ':'], ['Quote', "'", 1, '"'], ['Enter', 'return', 2.25, undefined, 'right'],
  ],
  [
    ['ShiftLeft', 'shift', 2.25, undefined, 'left'], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'],
    ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', 'M'], ['Comma', ',', 1, '<'],
    ['Period', '.', 1, '>'], ['Slash', '/', 1, '?'], ['ShiftRight', 'shift', 2.75, undefined, 'right'],
  ],
  [
    ['ControlLeft', 'control', 1.25, undefined, 'left'], ['AltLeft', 'option', 1.25, undefined, 'left'],
    ['MetaLeft', 'command', 1.5, undefined, 'left'], ['Space', '', 7],
    ['MetaRight', 'command', 1.5, undefined, 'right'], ['AltRight', 'option', 1.25, undefined, 'right'],
    ['ControlRight', 'control', 1.25, undefined, 'right'],
  ],
];

// Standard touch-typing zones.
const FINGER_OF: Record<string, Finger> = {};
const zone = (finger: Finger, codes: string) => codes.split(' ').forEach((c) => (FINGER_OF[c] = finger));
zone('lp', 'Backquote Digit1 Tab KeyQ CapsLock KeyA ShiftLeft KeyZ');
zone('lr', 'Digit2 KeyW KeyS KeyX');
zone('lm', 'Digit3 KeyE KeyD KeyC');
zone('li', 'Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB');
zone('ri', 'Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM');
zone('rm', 'Digit8 KeyI KeyK Comma');
zone('rr', 'Digit9 KeyO KeyL Period');
zone('rp', 'Digit0 Minus Equal Backspace KeyP BracketLeft BracketRight Backslash Semicolon Quote Enter Slash ShiftRight');
zone('rt', 'Space');

export const KEYBOARD_UNITS = { w: 15, h: 5 };

export const KEYS: KeyDef[] = ROWS.flatMap((row, y) => {
  let x = 0;
  return row.map(([code, label, w = 1, shift, mod]) => {
    const key: KeyDef = { code, label, w, shift, mod, finger: FINGER_OF[code] ?? null, x, y };
    x += w;
    return key;
  });
});

export const KEY_BY_CODE = new Map(KEYS.map((k) => [k.code, k]));

/** Home position of each finger (key centre, in key units). */
const center = (code: string) => {
  const k = KEY_BY_CODE.get(code)!;
  return { x: k.x + k.w / 2, y: k.y + 0.5 };
};
export const HOME: Record<Finger, { x: number; y: number }> = {
  lp: center('KeyA'),
  lr: center('KeyS'),
  lm: center('KeyD'),
  li: center('KeyF'),
  ri: center('KeyJ'),
  rm: center('KeyK'),
  rr: center('KeyL'),
  rp: center('Semicolon'),
  lt: { x: 5.6, y: 4.5 },
  rt: { x: 8.9, y: 4.5 },
};

export function keyCenter(code: string) {
  return center(code);
}

// Character -> physical key (+ whether shift is held).
const CHAR_TO_KEY = new Map<string, { code: string; shift: boolean }>();
for (const k of KEYS) {
  if (k.mod) continue;
  if (k.code === 'Space') CHAR_TO_KEY.set(' ', { code: k.code, shift: false });
  else if (/^Key[A-Z]$/.test(k.code)) {
    CHAR_TO_KEY.set(k.label.toLowerCase(), { code: k.code, shift: false });
    CHAR_TO_KEY.set(k.label, { code: k.code, shift: true });
  } else {
    CHAR_TO_KEY.set(k.label, { code: k.code, shift: false });
    if (k.shift) CHAR_TO_KEY.set(k.shift, { code: k.code, shift: true });
  }
}

export type KeyTarget = { code: string; finger: Finger; shiftCode: string | null; shiftFinger: Finger | null };

export function targetFor(char: string | undefined): KeyTarget | null {
  if (char === undefined) return null;
  const hit = CHAR_TO_KEY.get(char);
  if (!hit) return null;
  const finger = FINGER_OF[hit.code];
  if (!hit.shift) return { code: hit.code, finger, shiftCode: null, shiftFinger: null };
  // Shift with the opposite hand's pinky.
  const leftHand = finger.startsWith('l');
  return {
    code: hit.code,
    finger,
    shiftCode: leftHand ? 'ShiftRight' : 'ShiftLeft',
    shiftFinger: leftHand ? 'rp' : 'lp',
  };
}
