import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson';
import atlas50Url from 'world-atlas/countries-50m.json?url';
import atlas110Url from 'world-atlas/countries-110m.json?url';
import { COUNTRIES, type ContinentCode, type View } from '../data/places';

type CountryProps = { name: string };
type Atlas = Topology<{ countries: GeometryCollection<CountryProps> }>;

/** One level of detail of the world. */
export type WorldLayer = {
  land: MultiPolygon;
  borders: MultiLineString;
  continents: Record<ContinentCode, MultiPolygon>;
  countries: Map<string, Feature<Polygon | MultiPolygon, CountryProps>>; // keyed by cca3
};

export type World = { detailed: WorldLayer; coarse: WorldLayer };

const ID_TO_CCA3 = new Map(Object.entries(COUNTRIES).map(([cca3, c]) => [c.id, cca3]));
const CONTINENT_OF_CCA3 = new Map(Object.entries(COUNTRIES).map(([cca3, c]) => [cca3, c.continent]));
// Atlas features that carry no ISO id.
const UNNAMED: Record<string, { cca3: string; continent: ContinentCode }> = {
  Kosovo: { cca3: 'UNK', continent: 'EU' },
  'N. Cyprus': { cca3: 'NCY', continent: 'AS' },
  Somaliland: { cca3: 'SOL', continent: 'AF' },
};
const CONTINENT_CODES: ContinentCode[] = ['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'];

function buildLayer(topo: Atlas): WorldLayer {
  const geoms = topo.objects.countries.geometries;
  const nameOf = (g: (typeof geoms)[number]) => (g.properties as CountryProps | undefined)?.name ?? '';
  const cca3Of = (g: (typeof geoms)[number]) =>
    (g.id !== undefined ? ID_TO_CCA3.get(String(g.id)) : undefined) ?? UNNAMED[nameOf(g)]?.cca3;
  const continentOf = (g: (typeof geoms)[number]) => {
    const unnamed = UNNAMED[nameOf(g)];
    if (unnamed) return unnamed.continent;
    const cca3 = cca3Of(g);
    return cca3 ? CONTINENT_OF_CCA3.get(cca3) : undefined;
  };

  const continents = {} as Record<ContinentCode, MultiPolygon>;
  for (const code of CONTINENT_CODES) {
    continents[code] = merge(
      topo,
      geoms.filter((g) => {
        // Russia spans two continents; it reads as Asia on a globe, so keep it out of Europe's tint.
        if (cca3Of(g) === 'RUS') return code === 'AS';
        return continentOf(g) === code;
      }) as never,
    );
  }

  const countries = new Map<string, Feature<Polygon | MultiPolygon, CountryProps>>();
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon, CountryProps>;
  fc.features.forEach((f, i) => {
    const cca3 = cca3Of(geoms[i]);
    if (cca3) countries.set(cca3, f);
  });

  return {
    land: merge(topo, geoms as never),
    borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
    continents,
    countries,
  };
}

let worldPromise: Promise<World> | null = null;

export function loadWorld(): Promise<World> {
  worldPromise ??= Promise.all([
    fetch(atlas50Url).then((r) => r.json() as Promise<Atlas>),
    fetch(atlas110Url).then((r) => r.json() as Promise<Atlas>),
  ]).then(([detailed, coarse]) => ({ detailed: buildLayer(detailed), coarse: buildLayer(coarse) }));
  return worldPromise;
}

// Countries whose overseas parts would pull a computed view off-centre.
const COUNTRY_VIEWS: Record<string, View> = {
  USA: { center: [-98, 39], radius: 21 },
  RUS: { center: [96, 62], radius: 36 },
  NOR: { center: [12, 64], radius: 10 },
  NLD: { center: [5.3, 52.2], radius: 2.2 },
  DNK: { center: [10, 56], radius: 3.2 },
  FJI: { center: [178.5, -17.8], radius: 3 },
  KIR: { center: [-157, 1.5], radius: 25 },
  NZL: { center: [172.5, -41], radius: 9 },
  CHL: { center: [-71, -36], radius: 20 },
};

const TO_DEG = 180 / Math.PI;
const viewCache = new Map<string, View>();

/** Fit the main body of a country: polygons at least 20% the size of its largest piece. */
export function countryView(world: World, cca3: string): View | null {
  if (COUNTRY_VIEWS[cca3]) return COUNTRY_VIEWS[cca3];
  const cached = viewCache.get(cca3);
  if (cached) return cached;
  const f = world.detailed.countries.get(cca3);
  if (!f) return null;

  const polys: Position[][][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const areas = polys.map((p) => geoArea({ type: 'Polygon', coordinates: p }));
  const max = Math.max(...areas);
  const main: MultiPolygon = { type: 'MultiPolygon', coordinates: polys.filter((_, i) => areas[i] >= max * 0.2) };

  const center = geoCentroid(main) as [number, number];
  let radius = 0;
  for (const poly of main.coordinates) {
    for (const pt of poly[0]) radius = Math.max(radius, geoDistance(center, pt as [number, number]));
  }
  const view = { center, radius: Math.max(radius * TO_DEG, 1.2) };
  viewCache.set(cca3, view);
  return view;
}
