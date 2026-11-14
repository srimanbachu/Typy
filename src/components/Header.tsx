import type { Lesson } from '../data/lessons';

type Props = {
  lessons: Lesson[];
  current: number;
  best: Record<string, number>;
  onPick: (i: number) => void;
};

const SPACES = [
  { id: 'geography', name: 'Geography', ready: true },
  { id: 'muscles', name: 'Muscles', ready: false },
  { id: 'bones', name: 'Bones', ready: false },
];

export function Header({ lessons, current, best, onPick }: Props) {
  return (
    <header className="header">
      <div className="header-bar">
        <a className="brand" href="/" aria-label="Typy home">
          <span className="brand-mark" aria-hidden>
            <span />
          </span>
          typy
        </a>
        <nav className="spaces" aria-label="Spaces">
          {SPACES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`space${s.ready ? ' is-active' : ''}`}
              disabled={!s.ready}
              aria-current={s.ready ? 'page' : undefined}
            >
              {s.name}
              {!s.ready && <span className="soon">Soon</span>}
            </button>
          ))}
        </nav>
      </div>

      <nav className="lessons" aria-label="Lessons">
        {lessons.map((l, i) => (
          <button
            key={l.id}
            type="button"
            className={`lesson${i === current ? ' is-current' : ''}`}
            aria-current={i === current ? 'true' : undefined}
            onClick={(e) => {
              // Drop focus so the next Space/Enter goes to the passage, not the button.
              e.currentTarget.blur();
              onPick(i);
            }}
          >
            <span className="lesson-title">{l.title}</span>
            <span className="lesson-meta">{best[l.id] ? `${best[l.id]} wpm best` : l.blurb}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
