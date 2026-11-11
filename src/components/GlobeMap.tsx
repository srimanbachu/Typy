import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { geoCircle, geoDistance, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { CONTINENTS, WORLD_VIEW, type LonLat, type View } from '../data/places';
import { countryView, loadWorld, type World } from '../lib/geo';
import { KIND_LABEL, trailOf, type Focus } from '../lib/lesson';
import './map.css';

type Props = { focus: Focus | null };

type Camera = { center: LonLat; k: number };
type Flight = {
  from: Camera;
  to: Camera;
  interp: (t: number) => [number, number];
  dip: number;
  start: number;
  duration: number;
};
type Palette = Record<
  | 'water1' | 'water2' | 'land' | 'continent' | 'border' | 'countryFill' | 'countryStroke'
  | 'river' | 'range' | 'region' | 'areaFill' | 'areaStroke' | 'shade' | 'atmosphere' | 'atmosphereEdge',
  string
>;

const GLOBE_FIT = 0.43; // globe radius as a fraction of the shorter side
const FEATURE_FIT = 0.32; // a focused feature fills this fraction of the shorter side
const CENTER_Y = 0.43; // the bottom of the stage fades out, so the focal point sits a little high
const MAX_ZOOM = 90;
const HIGHLIGHT_FADE = 280;
const TAU = Math.PI * 2;
const TO_RAD = Math.PI / 180;

const zoomFor = (radiusDeg: number) =>
  Math.min(MAX_ZOOM, Math.max(1, FEATURE_FIT / (GLOBE_FIT * Math.sin(Math.min(radiusDeg, 89) * TO_RAD))));
/** Angular radius (radians) visible across half the shorter side at zoom k. */
const visibleRadius = (k: number) => Math.asin(Math.min(1, 0.5 / (GLOBE_FIT * k)));

function viewFor(focus: Focus | null, world: World | null): View {
  if (!focus) return WORLD_VIEW;
  if (focus.kind === 'continent' && focus.continent) return CONTINENTS[focus.continent].view;
  if (focus.kind === 'country' && focus.country) return (world && countryView(world, focus.country)) ?? WORLD_VIEW;
  return focus.place?.view ?? WORLD_VIEW;
}

function labelAnchor(focus: Focus, world: World | null): LonLat | null {
  const p = focus.place;
  if (p) return p.pin ?? p.labelAt ?? p.area?.center ?? p.view.center;
  return viewFor(focus, world).center;
}

function readPalette(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(`--map-${name}`).trim();
  return {
    water1: v('water-1'), water2: v('water-2'), land: v('land'), continent: v('continent'),
    border: v('border'), countryFill: v('country-fill'), countryStroke: v('country-stroke'),
    river: v('river'), range: v('range'), region: v('region'), areaFill: v('area-fill'),
    areaStroke: v('area-stroke'), shade: v('shade'), atmosphere: v('atmosphere'),
    atmosphereEdge: v('atmosphere-edge'),
  };
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function GlobeMap({ focus }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurRef = useRef<HTMLCanvasElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<World | null>(null);

  // Everything the render loop touches lives in one mutable bag, so typing never re-renders the canvas.
  const engine = useRef({
    camera: { center: WORLD_VIEW.center, k: 1 } as Camera,
    flight: null as Flight | null,
    focus: null as Focus | null,
    prevFocus: null as Focus | null,
    focusChangedAt: 0,
    size: { w: 0, h: 0, dpr: 1 },
    palette: null as Palette | null,
    raf: 0,
    world: null as World | null,
    draw: () => {},
    kick: () => {},
  });

  useEffect(() => {
    let alive = true;
    loadWorld().then((w) => alive && setWorld(w));
    return () => {
      alive = false;
    };
  }, []);

  // Render loop setup.
  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const blurCanvas = blurRef.current!;
    const bctx = blurCanvas.getContext('2d')!;
    const e = engine.current;
    const projection = geoOrthographic().precision(0.4);
    const path = geoPath(projection, ctx);
    const circle = geoCircle();

    const place = (el: HTMLElement | null, at: LonLat | null) => {
      if (!el) return;
      if (!at || geoDistance(at, e.camera.center) > Math.PI / 2 - 0.04) {
        el.style.visibility = 'hidden';
        return;
      }
      const pt = projection(at);
      if (!pt) return (el.style.visibility = 'hidden'), undefined;
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${pt[0].toFixed(1)}px, ${pt[1].toFixed(1)}px, 0)`;
    };

    const drawFocus = (f: Focus, alpha: number, layer: World['detailed'], zoom: number) => {
      const pal = e.palette!;
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      if (f.continent) {
        ctx.beginPath();
        path(layer.continents[f.continent]);
        ctx.fillStyle = pal.continent;
        ctx.fill();
      }
      const country = f.country ? layer.countries.get(f.country) : undefined;
      if (country) {
        ctx.beginPath();
        path(country);
        ctx.fillStyle = pal.countryFill;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = pal.countryStroke;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      const p = f.place;
      if (p?.area) {
        ctx.beginPath();
        path(circle.center(p.area.center).radius(p.area.radius)() as GeoPermissibleObjects);
        ctx.fillStyle = pal.areaFill;
        ctx.fill();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = pal.areaStroke;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (p?.line) {
        const color = p.kind === 'river' ? pal.river : p.kind === 'range' ? pal.range : pal.region;
        const width = p.kind === 'range' ? 3.5 : p.kind === 'region' ? 2.5 : 2.25;
        const scale = Math.min(1.6, 0.85 + Math.log2(zoom) * 0.12);
        ctx.beginPath();
        path({ type: 'LineString', coordinates: p.line });
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha * 0.22;
        ctx.lineWidth = width * 3.2 * scale;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        if (p.kind === 'region') ctx.setLineDash([2, 6]);
        ctx.lineWidth = width * scale;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    };

    e.draw = () => {
      const { w, h, dpr } = e.size;
      const world = e.world;
      if (!w || !h || !e.palette) return;
      const pal = e.palette;
      const now = performance.now();

      // Advance the camera.
      const f = e.flight;
      if (f) {
        const t = Math.min(1, (now - f.start) / f.duration);
        // Critically damped spring: starts from rest, settles without overshoot.
        const omega = 8;
        const x = t >= 1 ? 1 : 1 - (1 + omega * t) * Math.exp(-omega * t);
        const logK = Math.log(f.from.k) + (Math.log(f.to.k) - Math.log(f.from.k)) * x - f.dip * Math.sin(Math.PI * x);
        e.camera = { center: f.interp(x), k: Math.exp(logK) };
        if (t >= 1) e.flight = null;
      }

      const minDim = Math.min(w, h);
      const s0 = minDim * GLOBE_FIT;
      const scale = s0 * e.camera.k;
      const cx = w / 2;
      const cy = h * CENTER_Y;
      projection
        .rotate([-e.camera.center[0], -e.camera.center[1]])
        .scale(scale)
        .translate([cx, cy])
        .clipExtent([[-2, -2], [w + 2, h + 2]]);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Atmosphere and ocean.
      const globeOnScreen = scale < Math.hypot(w, h);
      if (globeOnScreen) {
        const halo = ctx.createRadialGradient(cx, cy, scale * 0.96, cx, cy, scale * 1.14);
        halo.addColorStop(0, pal.atmosphere);
        halo.addColorStop(1, pal.atmosphereEdge); // same hue at 0 alpha: 'transparent' would grey the falloff
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, scale * 1.14, 0, TAU);
        ctx.fill();
      }
      const ocean = ctx.createRadialGradient(cx - scale * 0.35, cy - scale * 0.4, 0, cx, cy, scale * 1.2);
      ocean.addColorStop(0, pal.water1);
      ocean.addColorStop(1, pal.water2);
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = globeOnScreen ? ocean : pal.water1;
      ctx.fill();

      if (world) {
        // Coarse geometry keeps fly-overs at 60fps; detail returns once the camera rests.
        const layer = e.flight && e.camera.k < 3 ? world.coarse : world.detailed;

        ctx.beginPath();
        path(layer.land);
        ctx.fillStyle = pal.land;
        ctx.fill();

        const fade = Math.min(1, (now - e.focusChangedAt) / HIGHLIGHT_FADE);
        const eased = 1 - Math.pow(1 - fade, 3);
        if (e.prevFocus && fade < 1) drawFocus(e.prevFocus, 1 - eased, layer, e.camera.k);

        ctx.beginPath();
        path(layer.borders);
        ctx.lineWidth = Math.min(1.4, 0.55 + Math.log2(e.camera.k) * 0.22);
        ctx.strokeStyle = pal.border;
        ctx.stroke();

        if (e.focus) drawFocus(e.focus, eased, layer, e.camera.k);
        if (fade >= 1) e.prevFocus = null;
      }

      // Soft terminator so the globe reads as a sphere; it fades as we zoom in.
      if (globeOnScreen) {
        const shadeAlpha = Math.max(0, 1 - (e.camera.k - 1) / 2.5);
        if (shadeAlpha > 0) {
          const shade = ctx.createRadialGradient(cx - scale * 0.3, cy - scale * 0.35, scale * 0.15, cx, cy, scale * 1.02);
          shade.addColorStop(0, 'transparent');
          shade.addColorStop(1, pal.shade);
          ctx.globalAlpha = shadeAlpha;
          ctx.beginPath();
          path({ type: 'Sphere' });
          ctx.fillStyle = shade;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Low-res copy for the blurred bottom edge (CSS blur + mask on a plain element works everywhere,
      // unlike masked backdrop-filter).
      bctx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
      bctx.drawImage(canvas, 0, 0, blurCanvas.width, blurCanvas.height);

      const fc = e.focus;
      place(pinRef.current, fc?.place?.pin ?? null);
      place(labelRef.current, fc ? labelAnchor(fc, world) : null);

      const highlightAnimating = e.prevFocus !== null || now - e.focusChangedAt < HIGHLIGHT_FADE;
      e.raf = e.flight || highlightAnimating ? requestAnimationFrame(e.draw) : 0;
    };

    e.kick = () => {
      if (!e.raf) e.raf = requestAnimationFrame(e.draw);
    };

    const resize = () => {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      e.size = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      blurCanvas.width = Math.round(r.width / 2);
      blurCanvas.height = Math.round(r.height / 2);
      e.palette = readPalette(stage);
      cancelAnimationFrame(e.raf);
      e.raf = 0;
      e.draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      e.palette = readPalette(stage);
      e.kick();
    };
    scheme.addEventListener('change', onScheme);

    return () => {
      ro.disconnect();
      scheme.removeEventListener('change', onScheme);
      cancelAnimationFrame(e.raf);
      e.raf = 0;
    };
  }, []);

  // React to world loading and focus changes by flying the camera.
  useEffect(() => {
    const e = engine.current;
    const firstWorld = e.world === null && world !== null;
    e.world = world;
    const sameFocus = e.focus?.ref === focus?.ref;
    if (!sameFocus) {
      e.prevFocus = e.focus;
      e.focus = focus;
      e.focusChangedAt = performance.now();
    }
    if (sameFocus && !firstWorld) return e.kick();

    const view = viewFor(focus, world);
    const to: Camera = { center: view.center, k: zoomFor(view.radius) };
    const from = e.camera;

    if (prefersReducedMotion()) {
      e.flight = null;
      e.camera = to;
      return e.kick();
    }

    const d = geoDistance(from.center, to.center);
    const kMid = Math.max(1, 0.5 / (GLOBE_FIT * Math.sin(Math.min(d / 2 + visibleRadius(to.k) * 0.6, Math.PI / 2))));
    const avg = (Math.log(from.k) + Math.log(to.k)) / 2;
    const dip = Math.max(0, avg - Math.log(kMid));
    const zoomSpan = Math.abs(Math.log(to.k / from.k));
    if (d < 1e-4 && zoomSpan < 1e-3) return e.kick();

    e.flight = {
      from,
      to,
      interp: geoInterpolate(from.center, to.center) as (t: number) => [number, number],
      dip,
      start: performance.now(),
      duration: Math.min(1700, Math.max(550, 600 + (d / Math.PI) * 650 + zoomSpan * 110 + dip * 160)),
    };
    e.kick();
  }, [focus, world]);

  const trail = focus ? trailOf(focus) : ['The World'];
  const kind = focus ? KIND_LABEL[focus.kind] : 'Overview';

  return (
    <section className="map" aria-label={`Map showing ${trail.join(', ')}`}>
      <div className="map-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="map-canvas" aria-hidden />
        <canvas ref={blurRef} className="map-canvas map-canvas--blur" aria-hidden />
        <div className="map-overlay" aria-hidden>
          <div ref={pinRef} className={`map-pin map-pin--${focus?.place?.kind ?? 'none'}`}>
            <span className="map-pin-pulse" />
            <span className="map-pin-dot" />
          </div>
          {focus && (
            <div ref={labelRef} className={`map-label map-label--${focus.kind}`}>
              <span key={focus.ref} className="map-label-text">
                {focus.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="map-hud">
        <div key={focus?.ref ?? 'world'} className="map-crumb">
          <span className="map-kind">{kind}</span>
          <span className="map-trail">
            {trail.map((t, i) => (
              <span key={t + i} className={i === trail.length - 1 ? 'is-current' : undefined}>
                {t}
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
