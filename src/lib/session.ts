import { useReducer } from 'react';

export type Session = {
  text: string;
  typed: string;
  startedAt: number | null;
  finishedAt: number | null;
  keystrokes: number;
  mistakes: number;
};

type Action =
  | { type: 'char'; char: string; at: number }
  | { type: 'back'; word: boolean }
  | { type: 'reset'; text: string };

function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case 'reset':
      return freshSession(a.text);
    case 'char': {
      if (s.finishedAt !== null || s.typed.length >= s.text.length) return s;
      const correct = a.char === s.text[s.typed.length];
      const typed = s.typed + a.char;
      return {
        ...s,
        typed,
        startedAt: s.startedAt ?? a.at,
        finishedAt: typed.length === s.text.length ? a.at : null,
        keystrokes: s.keystrokes + 1,
        mistakes: s.mistakes + (correct ? 0 : 1),
      };
    }
    case 'back': {
      if (s.finishedAt !== null || s.typed.length === 0) return s;
      if (!a.word) return { ...s, typed: s.typed.slice(0, -1) };
      // Option/Ctrl+Backspace: drop trailing spaces, then the word before them.
      const trimmed = s.typed.replace(/\s+$/, '');
      const cut = trimmed.lastIndexOf(' ') + 1;
      return { ...s, typed: s.typed.slice(0, cut) };
    }
  }
}

export function freshSession(text: string): Session {
  return { text, typed: '', startedAt: null, finishedAt: null, keystrokes: 0, mistakes: 0 };
}

export function useSession(text: string) {
  return useReducer(reducer, text, freshSession);
}

export type Stats = { wpm: number; accuracy: number; seconds: number; correct: number; progress: number };

export function statsOf(s: Session, now: number): Stats {
  let correct = 0;
  for (let i = 0; i < s.typed.length; i++) if (s.typed[i] === s.text[i]) correct++;
  const end = s.finishedAt ?? now;
  const seconds = s.startedAt === null ? 0 : Math.max(0, (end - s.startedAt) / 1000);
  // Hold off on WPM for the first two seconds; a single fast word reads as 200 wpm otherwise.
  const wpm = seconds < 2 ? 0 : Math.round(correct / 5 / (seconds / 60));
  const accuracy = s.keystrokes === 0 ? 100 : Math.round(((s.keystrokes - s.mistakes) / s.keystrokes) * 100);
  return { wpm, accuracy, seconds, correct, progress: s.typed.length / s.text.length };
}
