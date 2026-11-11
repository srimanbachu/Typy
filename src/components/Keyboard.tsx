import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FINGER_NAMES, HOME, KEYS, KEY_BY_CODE, keyCenter, type Finger, type KeyTarget } from '../lib/keyboard';
import './keyboard.css';

type Props = { target: KeyTarget | null; nextChar: string | undefined };

const LEFT: Finger[] = ['lp', 'lr', 'lm', 'li'];
const RIGHT: Finger[] = ['ri', 'rm', 'rr', 'rp'];

// Finger capsule shape, in key units: visible length from tip to palm, width, and resting angle.
const SHAPE: Record<Finger, { len: number; w: number; angle: number }> = {
  lp: { len: 1.9, w: 0.44, angle: -14 },
  lr: { len: 2.3, w: 0.48, angle: -6 },
  lm: { len: 2.5, w: 0.5, angle: 2 },
  li: { len: 2.3, w: 0.5, angle: 10 },
  ri: { len: 2.3, w: 0.5, angle: -10 },
  rm: { len: 2.5, w: 0.5, angle: -2 },
  rr: { len: 2.3, w: 0.48, angle: 6 },
  rp: { len: 1.9, w: 0.44, angle: 14 },
  lt: { len: 1.5, w: 0.56, angle: 58 },
  rt: { len: 1.5, w: 0.56, angle: -58 },
};

const u = (n: number) => `calc(var(--u) * ${n})`;
const fingerColor = (f: Finger) => `var(--finger-${f === 'lt' || f === 'rt' ? 'thumb' : f})`;

function displayChar(c: string | undefined) {
  if (c === undefined) return null;
  if (c === ' ') return 'space';
  return c;
}

export function Keyboard({ target, nextChar }: Props) {
  const [down, setDown] = useState<Record<string, 'ok' | 'wrong'>>({});
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    // Capture phase: runs before the typing handler advances the target, so we judge the press against
    // the key that was actually expected.
    const onDown = (e: KeyboardEvent) => {
      if (!KEY_BY_CODE.has(e.code)) return;
      const t = targetRef.current;
      const isModifier = /Shift|Control|Alt|Meta|CapsLock|Tab/.test(e.code);
      const ok = !t || isModifier || e.code === t.code || e.code === 'Backspace';
      setDown((d) => (d[e.code] ? d : { ...d, [e.code]: ok ? 'ok' : 'wrong' }));
    };
    const onUp = (e: KeyboardEvent) => {
      setDown((d) => {
        if (!d[e.code]) return d;
        const next = { ...d };
        delete next[e.code];
        return next;
      });
    };
    const clear = () => setDown({});
    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
      window.removeEventListener('blur', clear);
    };
  }, []);

  // Where each finger should be right now.
  const reach: Partial<Record<Finger, { x: number; y: number }>> = {};
  if (target) {
    reach[target.finger] = keyCenter(target.code);
    if (target.shiftCode && target.shiftFinger) reach[target.shiftFinger] = keyCenter(target.shiftCode);
  }

  const active = new Set<string>();
  if (target) {
    active.add(target.code);
    if (target.shiftCode) active.add(target.shiftCode);
  }

  const next = displayChar(nextChar);

  return (
    <section className="kb" aria-label="Keyboard guide">
      <div className="kb-viewport" aria-hidden>
        <div className="kb-scene">
          <div className="kb-case" />
          {KEYS.map((k) => {
            const state = down[k.code];
            const cls = [
              'key',
              k.mod && `key--mod key--${k.mod}`,
              k.code === 'Space' && 'key--space',
              active.has(k.code) && 'is-target',
              state && 'is-down',
              state === 'wrong' && 'is-wrong',
              (k.code === 'KeyF' || k.code === 'KeyJ') && 'has-bump',
            ]
              .filter(Boolean)
              .join(' ');
            const style = {
              left: u(k.x),
              top: u(k.y),
              width: u(k.w),
              '--fc': k.finger ? fingerColor(k.finger) : 'var(--finger-none)',
            } as CSSProperties;
            return (
              <div key={k.code} className={cls} style={style}>
                <div className="key-wall" />
                <div className="key-top">
                  {k.shift && <span className="key-shift">{k.shift}</span>}
                  <span className="key-label">{k.label}</span>
                </div>
              </div>
            );
          })}

          <div className="hands">
            {([...LEFT, ...RIGHT, 'lt', 'rt'] as Finger[]).map((f) => {
              const home = HOME[f];
              const to = reach[f] ?? home;
              const s = SHAPE[f];
              const style = {
                left: u(home.x - s.w / 2),
                top: u(home.y - s.w / 2 + 0.12),
                width: u(s.w),
                height: u(s.len),
                transformOrigin: `50% ${u(s.w / 2)}`,
                transform: `translate(${u(to.x - home.x)}, ${u(to.y - home.y)}) rotate(${s.angle}deg)`,
                '--fc': fingerColor(f),
              } as CSSProperties;
              return (
                <div key={f} className={`finger${reach[f] ? ' is-reaching' : ''}`} style={style}>
                  <span className="nail" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="kb-caption">
        <ul className="kb-legend">
          {[...LEFT, ...RIGHT].map((f) => (
            <li key={f} style={{ '--fc': `var(--finger-${f})` } as CSSProperties} title={FINGER_NAMES[f]}>
              <span className="dot" />
              {FINGER_NAMES[f].split(' ')[1]}
            </li>
          ))}
        </ul>
        <p className="kb-next">
          {next && target ? (
            <>
              Next <kbd>{next}</kbd>
              {target.shiftCode && (
                <>
                  {' '}
                  with <kbd>shift</kbd>
                </>
              )}
              <span className="kb-next-finger" style={{ '--fc': fingerColor(target.finger) } as CSSProperties}>
                {FINGER_NAMES[target.finger]}
              </span>
            </>
          ) : (
            <span className="kb-next-idle">Rest your fingers on the home row: A S D F and J K L ;</span>
          )}
        </p>
      </div>
    </section>
  );
}
