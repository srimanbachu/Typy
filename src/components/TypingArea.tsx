import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ParsedLesson } from '../lib/lesson';
import { statsOf, type Session } from '../lib/session';
import './typing.css';

type Props = { lesson: ParsedLesson; session: Session; activeSpan: number };

type Word = { start: number; end: number }; // [start, end) excluding the trailing space

function splitWords(text: string): Word[] {
  const words: Word[] = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === ' ') {
      words.push({ start, end: i });
      start = i + 1;
    }
  }
  return words;
}

function charClass(lesson: ParsedLesson, typed: string, i: number, activeSpan: number) {
  let cls = 'ch';
  if (i < typed.length) cls += typed[i] === lesson.text[i] ? ' is-ok' : ' is-bad';
  const span = lesson.spanAt[i];
  if (span !== -1) cls += span === activeSpan ? ' is-ref is-ref-active' : ' is-ref';
  return cls;
}

const Chars = memo(function Chars({
  lesson,
  typed,
  activeSpan,
  register,
}: {
  lesson: ParsedLesson;
  typed: string;
  activeSpan: number;
  register: (i: number, el: HTMLSpanElement | null) => void;
}) {
  const words = useMemo(() => splitWords(lesson.text), [lesson]);
  return (
    <>
      {words.map((w) => {
        const nodes = [];
        for (let i = w.start; i < w.end; i++) {
          nodes.push(
            <span key={i} ref={(el) => register(i, el)} className={charClass(lesson, typed, i, activeSpan)}>
              {lesson.text[i]}
            </span>,
          );
        }
        const space = w.end < lesson.text.length ? w.end : -1;
        return (
          <span key={w.start} className="word-wrap">
            <span className="word">{nodes}</span>
            {space !== -1 && (
              <span ref={(el) => register(space, el)} className={charClass(lesson, typed, space, activeSpan) + ' is-space'}>
                {' '}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
});

export function TypingArea({ lesson, session, activeSpan }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const charEls = useRef<(HTMLSpanElement | null)[]>([]);
  const register = useMemo(() => (i: number, el: HTMLSpanElement | null) => (charEls.current[i] = el), []);
  const [typing, setTyping] = useState(false);
  const [, setTick] = useState(0);

  const cursor = session.typed.length;
  const running = session.startedAt !== null && session.finishedAt === null;

  // Live stats refresh while the clock runs.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  // Caret goes solid while typing and blinks once the typist pauses.
  useEffect(() => {
    if (cursor === 0) return setTyping(false);
    setTyping(true);
    const id = setTimeout(() => setTyping(false), 650);
    return () => clearTimeout(id);
  }, [cursor]);

  // Place the caret and keep the active line in view. Written straight to style: no re-render per keystroke.
  useLayoutEffect(() => {
    const caret = caretRef.current;
    const inner = innerRef.current;
    if (!caret || !inner) return;
    const atEnd = cursor >= lesson.text.length;
    const el = charEls.current[atEnd ? lesson.text.length - 1 : cursor];
    if (!el) return;
    const x = atEnd ? el.offsetLeft + el.offsetWidth : el.offsetLeft;
    const y = el.offsetTop;
    caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    caret.style.height = `${el.offsetHeight}px`;

    // Words are inline-blocks one line tall, so the word box gives the true line geometry.
    const wrap = el.closest<HTMLElement>('.word-wrap');
    if (!wrap) return;
    const lineH = wrap.offsetHeight;
    const line = Math.round(wrap.offsetTop / lineH);
    inner.style.transform = `translate3d(0, ${-Math.max(0, line - 1) * lineH}px, 0)`;
  }, [cursor, lesson]);

  // Reset scroll instantly when a new lesson loads.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.style.transition = 'none';
    inner.style.transform = 'translate3d(0,0,0)';
    void inner.offsetHeight;
    inner.style.transition = '';
  }, [lesson]);

  const stats = statsOf(session, performance.now());
  const wordsTotal = useMemo(() => splitWords(lesson.text).length, [lesson]);
  const wordsDone = session.typed.split(' ').length - (session.typed.endsWith(' ') || cursor === 0 ? 1 : 0);

  return (
    <section className="typing" aria-label="Typing passage">
      <div className="typing-stats" aria-live="off">
        <Stat label="wpm" value={stats.wpm} strong />
        <Stat label="accuracy" value={`${stats.accuracy}%`} />
        <Stat label="time" value={formatTime(stats.seconds)} />
        <Stat label="words" value={`${Math.min(wordsDone, wordsTotal)}/${wordsTotal}`} />
        <p className={`typing-hint${cursor > 0 ? ' is-hidden' : ''}`}>Start typing. The map follows the places you read about.</p>
        <div className="typing-progress" aria-hidden>
          <span style={{ transform: `scaleX(${stats.progress})` }} />
        </div>
      </div>

      <div className="typing-box" ref={boxRef}>
        <div className="typing-inner" ref={innerRef}>
          <Chars lesson={lesson} typed={session.typed} activeSpan={activeSpan} register={register} />
          <span ref={caretRef} className={`caret${typing ? ' is-typing' : ''}`} aria-hidden />
        </div>
      </div>

    </section>
  );
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className={`stat${strong ? ' stat--strong' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function formatTime(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
