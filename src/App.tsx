import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS } from './data/lessons';
import { GlobeMap } from './components/GlobeMap';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { Results } from './components/Results';
import { TypingArea } from './components/TypingArea';
import { activeSpanIndex, parseLesson, type Focus } from './lib/lesson';
import { targetFor } from './lib/keyboard';
import { freshSession, statsOf, useSession } from './lib/session';
import { loadBest, saveBest } from './lib/storage';

export default function App() {
  const [lessonIdx, setLessonIdx] = useState(0);
  const lesson = useMemo(() => parseLesson(LESSONS[lessonIdx].source), [lessonIdx]);
  const [rawSession, dispatch] = useSession(lesson.text);
  // Until the reset lands, never show the previous lesson's keystrokes against the new text.
  const session = rawSession.text === lesson.text ? rawSession : freshSession(lesson.text);
  const [preview, setPreview] = useState<Focus | null>(null);
  const [best, setBest] = useState<Record<string, number>>(loadBest);

  const restart = useCallback(() => {
    setPreview(null);
    dispatch({ type: 'reset', text: lesson.text });
  }, [dispatch, lesson.text]);

  // New lesson -> fresh session.
  useEffect(() => {
    restart();
  }, [restart]);

  const finished = session.finishedAt !== null;
  const cursor = session.typed.length;
  const activeSpan = finished ? -1 : activeSpanIndex(lesson, cursor);
  const stats = statsOf(session, performance.now());

  // Record a personal best once per finished run.
  const recorded = useRef<number | null>(null);
  useEffect(() => {
    if (!finished || recorded.current === session.finishedAt) return;
    recorded.current = session.finishedAt;
    const id = LESSONS[lessonIdx].id;
    setBest((b) => {
      if ((b[id] ?? 0) >= stats.wpm) return b;
      const next = { ...b, [id]: stats.wpm };
      saveBest(next);
      return next;
    });
  }, [finished, session.finishedAt, lessonIdx, stats.wpm]);

  const hasNext = lessonIdx < LESSONS.length - 1;
  const next = useCallback(() => setLessonIdx((i) => Math.min(i + 1, LESSONS.length - 1)), []);

  // Keyboard input lives on the window: no hidden input, no focus to lose.
  const live = useRef({ finished, restart, next, hasNext });
  live.current = { finished, restart, next, hasNext };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const s = live.current;
      const onButton = e.target instanceof HTMLButtonElement;
      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        s.restart();
        return;
      }
      if (e.key === 'Enter') {
        if (onButton) return;
        if (s.finished && s.hasNext) {
          e.preventDefault();
          s.next();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'back', word: e.altKey || e.ctrlKey || e.metaKey });
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      if (onButton && e.key === ' ') (e.target as HTMLElement).blur();
      e.preventDefault(); // stops page scroll on space and Firefox quick-find on ' and /
      dispatch({ type: 'char', char: e.key, at: performance.now() });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const places = useMemo(() => {
    const seen = new Map<string, Focus>();
    for (const s of lesson.spans) if (!seen.has(s.ref)) seen.set(s.ref, s.focus);
    return [...seen.values()];
  }, [lesson]);

  const focus: Focus | null = finished ? preview : activeSpan >= 0 ? lesson.spans[activeSpan].focus : null;
  const target = finished ? null : targetFor(lesson.text[cursor]);

  return (
    <div className="app">
      <Header lessons={LESSONS} current={lessonIdx} best={best} onPick={setLessonIdx} />
      <main className="stage">
        <GlobeMap focus={focus} />
        <div className="stage-words">
          {finished ? (
            <Results
              stats={stats}
              mistakes={session.mistakes}
              places={places}
              preview={preview}
              best={best[LESSONS[lessonIdx].id] ?? null}
              onPreview={setPreview}
              onRetry={restart}
              onNext={hasNext ? next : null}
            />
          ) : (
            <TypingArea lesson={lesson} session={session} activeSpan={activeSpan} />
          )}
        </div>
        <Keyboard target={target} nextChar={finished ? undefined : lesson.text[cursor]} />
      </main>
      <footer className="footer">
        <span>
          <kbd>tab</kbd> restart
        </span>
        <span>
          <kbd>option</kbd> + <kbd>delete</kbd> delete word
        </span>
      </footer>
    </div>
  );
}
