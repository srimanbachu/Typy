import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { HOME, KEYS, KEY_BY_CODE, keyCenter, type Finger, type KeyTarget } from '../lib/keyboard';
import {
  HOME_PLACEMENT,
  loadHintState,
  loadKeyboardPlacement,
  saveHintState,
  saveKeyboardPlacement,
  type Placement,
} from '../lib/storage';
import './keyboard.css';

type Props = { target: KeyTarget | null };

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

type Point = { x: number; y: number };
type Move = { kind: 'move'; id: number; start: Point; from: Placement; min: Point; max: Point };
type Resize = { kind: 'resize'; id: number; start: Point; from: Placement; reach: Point; min: number; max: number };

// Key size limits, mirroring --u in keyboard.css. The default key is 42px (smaller when the column is narrow).
// Resizing goes down to a key that still reads comfortably and up a touch past the default: the keyboard is a
// guide under the text, never the main event. It also never outgrows the content column.
const DEFAULT_KEY = 42;
const MIN_KEY = 28;
const MAX_KEY = 46;
const COLUMN_IN_KEYS = 16.6;
const COLUMN_INSET = 24;

// Hover hint: teach the gesture to people who haven't found it, then stop.
const HINT_DWELL = 450; // the pointer has to rest on the keyboard, not just pass over it
const HINT_DURATION = 2700; // one play-through of the demos
const HINT_COOLDOWN = 20_000; // between showings
const HINT_MAX_SHOWS = 3; // across visits; after that they've seen it and chosen not to
const TYPING_QUIET = 2000; // never while someone is typing
const CUE_DURATION = 900; // the resize button's pulse after the hint

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ResizeIcon = ({ className }: { className?: string }) => (
  <svg className={className} {...iconProps}>
    <path d="M4 10V4h6M20 14v6h-6M4 4l6.5 6.5M20 20l-6.5-6.5" />
  </svg>
);

// Round, translucent pointer in the spirit of iPadOS: the outer element travels, the inner dot presses.
const DemoPointer = () => (
  <div className="kb-demo-pointer">
    <span />
  </div>
);

export function Keyboard({ target }: Props) {
  const [down, setDown] = useState<Record<string, 'ok' | 'wrong'>>({});
  const targetRef = useRef(target);
  targetRef.current = target;

  // Moving and resizing write straight to the DOM: a pointer move shouldn't re-render sixty keys.
  const viewportRef = useRef<HTMLDivElement>(null);
  const caseRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLDivElement>(null);
  const placement = useRef<Placement>(HOME_PLACEMENT);
  const gesture = useRef<Move | Resize | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hintTimers = useRef<number[]>([]);
  const hintState = useRef(loadHintState());
  const lastHintAt = useRef(-Infinity);
  const lastTypedAt = useRef(-Infinity);
  const overGrip = useRef(false);

  const place = (p: Placement) => {
    placement.current = p;
    const el = viewportRef.current;
    if (!el) return;
    el.style.translate = `${p.x}px ${p.y}px`;
    el.style.setProperty('--kb-scale', String(p.scale));
  };

  // On-screen box of the keyboard plus its resize grip, so the grip can never end up out of reach.
  const bounds = () => {
    const a = caseRef.current!.getBoundingClientRect();
    const b = gripRef.current!.getBoundingClientRect();
    const left = Math.min(a.left, b.left);
    const top = Math.min(a.top, b.top);
    const right = Math.max(a.right, b.right);
    const bottom = Math.max(a.bottom, b.bottom);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };

  // Pull the keyboard back if a saved placement, a resize, or a narrower window leaves it off the page.
  const fit = () => {
    if (!caseRef.current || !gripRef.current) return;
    const r = bounds();
    let dx = 0;
    let dy = 0;
    if (r.right > window.innerWidth) dx = window.innerWidth - r.right;
    if (r.left + dx < 0) dx = -r.left;
    if (r.top + window.scrollY < 0) dy = -(r.top + window.scrollY);
    if (dx || dy) place({ ...placement.current, x: placement.current.x + dx, y: placement.current.y + dy });
  };

  useEffect(() => {
    place(loadKeyboardPlacement());
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const hideHint = () => {
    hintTimers.current.forEach(clearTimeout);
    hintTimers.current = [];
    viewportRef.current?.classList.remove('is-hinting', 'is-cueing');
  };

  // Whether the hint may show right now. Checked when the pointer arrives and again when the dwell ends.
  const hintAllowed = () => {
    const h = hintState.current;
    const now = performance.now();
    return (
      !h.learned &&
      h.shows < HINT_MAX_SHOWS &&
      !gesture.current &&
      !overGrip.current &&
      now - lastTypedAt.current > TYPING_QUIET &&
      now - lastHintAt.current > HINT_COOLDOWN
    );
  };

  const showHint = () => {
    if (!hintAllowed()) return;
    const el = viewportRef.current;
    if (!el) return;
    lastHintAt.current = performance.now();
    hintState.current = { ...hintState.current, shows: hintState.current.shows + 1 };
    saveHintState(hintState.current);
    el.classList.add('is-hinting');
    hintTimers.current.push(
      window.setTimeout(() => {
        // Played through without interruption: fade out, then pulse the resize button so the eye finds it.
        el.classList.remove('is-hinting');
        if (overGrip.current || gesture.current) return;
        el.classList.add('is-cueing');
        hintTimers.current.push(window.setTimeout(() => el.classList.remove('is-cueing'), CUE_DURATION));
      }, HINT_DURATION),
    );
  };

  const onPointerEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !hintAllowed()) return;
    hideHint();
    hintTimers.current.push(window.setTimeout(showHint, HINT_DWELL));
  };

  // Heading for the resize button means they've found it: no hint, no pulse.
  const onGripEnter = () => {
    overGrip.current = true;
    hideHint();
  };
  const onGripLeave = () => {
    overGrip.current = false;
  };

  // Scale limits for the current column width (see DEFAULT_KEY / MIN_KEY).
  const scaleLimits = () => {
    const fit = ((sectionRef.current?.clientWidth ?? 0) - COLUMN_INSET) / COLUMN_IN_KEYS;
    const base = Math.min(DEFAULT_KEY, fit);
    return { min: Math.min(1, MIN_KEY / base), max: Math.max(1, Math.min(MAX_KEY, fit) / base) };
  };

  const begin = (e: ReactPointerEvent<HTMLElement>, kind: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    hideHint();
    viewportRef.current?.classList.add('is-dragging', kind === 'resize' ? 'is-resizing' : 'is-moving');
    return bounds();
  };

  const onMoveStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !caseRef.current || !gripRef.current) return;
    const r = begin(e, 'move');
    // Keep the keyboard inside the window while dragging, without snapping it if it already sits partly outside.
    gesture.current = {
      kind: 'move',
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      from: placement.current,
      min: { x: Math.min(0, -r.left), y: Math.min(0, -r.top) },
      max: { x: Math.max(0, window.innerWidth - r.right), y: Math.max(0, window.innerHeight - r.bottom) },
    };
  };

  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !caseRef.current || !gripRef.current) return;
    const r = begin(e, 'resize');
    const { min, max } = scaleLimits();
    // The keyboard grows from its top centre, so the corner grip travels half the width change sideways
    // and the full height change downward. Measuring the pointer along that path keeps the grip under it.
    // A saved scale from a wider window may sit outside today's limits, so start from the clamped value.
    gesture.current = {
      kind: 'resize',
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      from: { ...placement.current, scale: Math.min(max, Math.max(min, placement.current.scale)) },
      reach: { x: r.width / 2, y: r.height },
      min,
      max,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (g.kind === 'move') {
      place({
        ...g.from,
        x: g.from.x + Math.min(g.max.x, Math.max(g.min.x, dx)),
        y: g.from.y + Math.min(g.max.y, Math.max(g.min.y, dy)),
      });
    } else {
      const growth = (dx * g.reach.x + dy * g.reach.y) / (g.reach.x ** 2 + g.reach.y ** 2);
      const scale = Math.min(g.max, Math.max(g.min, g.from.scale * (1 + growth)));
      place({ ...g.from, scale });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    viewportRef.current?.classList.remove('is-dragging', 'is-resizing', 'is-moving');
    if (g.kind === 'resize') fit();
    saveKeyboardPlacement(placement.current);
    // They've moved or resized it themselves: the hint has done its job for good.
    const p = placement.current;
    if (!hintState.current.learned && (p.x !== g.from.x || p.y !== g.from.y || p.scale !== g.from.scale)) {
      hintState.current = { ...hintState.current, learned: true };
      saveHintState(hintState.current);
    }
  };

  // Double-click puts it back where it started, at its original size.
  const onDoubleClick = () => {
    place(HOME_PLACEMENT);
    saveKeyboardPlacement(HOME_PLACEMENT);
  };

  useEffect(() => {
    const onType = () => {
      lastTypedAt.current = performance.now();
      hideHint();
    };
    window.addEventListener('keydown', onType, true);
    return () => {
      window.removeEventListener('keydown', onType, true);
      hintTimers.current.forEach(clearTimeout);
    };
  }, []);

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

  return (
    <section className="kb" ref={sectionRef} aria-label="Keyboard guide">
      <div className="kb-viewport" ref={viewportRef} aria-hidden>
        <div className="kb-stage">
          <div
            className="kb-scene"
            onPointerEnter={onPointerEnter}
            onPointerLeave={hideHint}
            onPointerDown={onMoveStart}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            {/* Hinged at the front edge so the top can lift off the desk, like a keyboard on its feet. */}
            <div className="kb-body">
              <div className="kb-case" ref={caseRef} />
              <div
                className="kb-resize"
                ref={gripRef}
                onPointerEnter={onGripEnter}
                onPointerLeave={onGripLeave}
                onPointerDown={onResizeStart}
              >
                <ResizeIcon />
              </div>
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
        </div>

        {/* Wordless how-to, after Apple's gesture previews: each tile acts the gesture out once. */}
        <div className="kb-hint">
          <figure className="kb-demo kb-demo--drag">
            <div className="kb-demo-stage">
              <div className="kb-drag-group">
                <div className="kb-demo-shape kb-drag-card" />
                <DemoPointer />
              </div>
            </div>
            <figcaption>Drag</figcaption>
          </figure>
          <figure className="kb-demo kb-demo--resize">
            <div className="kb-demo-stage">
              <div className="kb-demo-shape kb-resize-box" />
              <div className="kb-resize-handle">
                <DemoPointer />
              </div>
            </div>
            <figcaption>Resize</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
