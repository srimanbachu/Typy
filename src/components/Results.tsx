import { KIND_LABEL, type Focus } from '../lib/lesson';
import type { Stats } from '../lib/session';
import { formatTime } from './TypingArea';

type Props = {
  stats: Stats;
  mistakes: number;
  places: Focus[];
  preview: Focus | null;
  best: number | null;
  onPreview: (f: Focus | null) => void;
  onRetry: () => void;
  onNext: (() => void) | null;
};

export function Results({ stats, mistakes, places, preview, best, onPreview, onRetry, onNext }: Props) {
  const isBest = best !== null && stats.wpm >= best;
  return (
    <section className="results" aria-label="Lesson results">
      <div className="results-head">
        <div className="results-wpm">
          <span className="results-wpm-value">{stats.wpm}</span>
          <span className="results-wpm-label">wpm{isBest && <em>personal best</em>}</span>
        </div>
        <dl className="results-stats">
          <div>
            <dt>accuracy</dt>
            <dd>{stats.accuracy}%</dd>
          </div>
          <div>
            <dt>time</dt>
            <dd>{formatTime(stats.seconds)}</dd>
          </div>
          <div>
            <dt>mistakes</dt>
            <dd>{mistakes}</dd>
          </div>
        </dl>
      </div>

      <div className="results-places">
        <h3>You travelled through {places.length} places</h3>
        <ul>
          {places.map((p, i) => (
            <li key={p.ref} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              <button
                type="button"
                className={`place-chip${preview?.ref === p.ref ? ' is-on' : ''}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPreview(preview?.ref === p.ref ? null : p);
                }}
              >
                <span className="place-chip-kind">{KIND_LABEL[p.kind]}</span>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="results-actions">
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Try again <kbd>tab</kbd>
        </button>
        {onNext && (
          <button type="button" className="btn btn--primary" onClick={onNext}>
            Next lesson <kbd>return</kbd>
          </button>
        )}
      </div>
    </section>
  );
}
