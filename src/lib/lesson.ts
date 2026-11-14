import {
  CONTINENTS,
  COUNTRIES,
  PLACES,
  type ContinentCode,
  type Place,
  type PlaceKind,
} from '../data/places';

export type Focus = {
  ref: string;
  kind: PlaceKind;
  name: string;
  continent: ContinentCode | null;
  country: string | null;
  place: Place | null;
};

export type RefSpan = { ref: string; start: number; end: number; focus: Focus };

export type ParsedLesson = {
  text: string;
  spans: RefSpan[];
  /** For each character index, the span it belongs to, or -1. */
  spanAt: Int16Array;
};

const REF = /\{([^|}]+)\|([^}]+)\}/g;

export function resolveRef(ref: string): Focus {
  if (ref in CONTINENTS) {
    const c = ref as ContinentCode;
    return { ref, kind: 'continent', name: CONTINENTS[c].name, continent: c, country: null, place: null };
  }
  const country = COUNTRIES[ref];
  if (country) {
    return { ref, kind: 'country', name: country.name, continent: country.continent, country: ref, place: null };
  }
  const place = PLACES[ref];
  if (!place) throw new Error(`Unknown place ref "${ref}"`);
  return {
    ref,
    kind: place.kind,
    name: place.name,
    continent: place.continent ?? (place.country ? COUNTRIES[place.country]?.continent : null) ?? null,
    country: place.country ?? null,
    place,
  };
}

export function parseLesson(source: string): ParsedLesson {
  let text = '';
  const spans: RefSpan[] = [];
  let last = 0;
  for (const m of source.matchAll(REF)) {
    text += source.slice(last, m.index);
    const start = text.length;
    text += m[1];
    spans.push({ ref: m[2], start, end: text.length, focus: resolveRef(m[2]) });
    last = m.index + m[0].length;
  }
  text += source.slice(last);

  const spanAt = new Int16Array(text.length).fill(-1);
  spans.forEach((s, i) => spanAt.fill(i, s.start, s.end));
  return { text, spans, spanAt };
}

/** The place the typist is currently "in": the latest reference that starts at or before the cursor. */
export function activeSpanIndex(lesson: ParsedLesson, cursor: number): number {
  let active = -1;
  for (let i = 0; i < lesson.spans.length; i++) {
    if (lesson.spans[i].start <= cursor) active = i;
    else break;
  }
  return active;
}

export const KIND_LABEL: Record<PlaceKind, string> = {
  continent: 'Continent',
  country: 'Country',
  city: 'City',
  capital: 'Capital city',
  river: 'River',
  mountain: 'Mountain',
  range: 'Mountain range',
  desert: 'Desert',
  region: 'Region',
};

/** Breadcrumb trail, broadest first: Africa › Egypt › Nile. */
export function trailOf(focus: Focus): string[] {
  const trail: string[] = [];
  if (focus.continent && focus.kind !== 'continent') trail.push(CONTINENTS[focus.continent].name);
  if (focus.country && focus.kind !== 'country') trail.push(COUNTRIES[focus.country].name);
  trail.push(focus.name);
  return trail;
}
