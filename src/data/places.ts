import countriesJson from './countries.json';

export type ContinentCode = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
export type LonLat = [number, number];

export type PlaceKind =
  | 'continent'
  | 'country'
  | 'city'
  | 'capital'
  | 'river'
  | 'mountain'
  | 'range'
  | 'desert'
  | 'region';

export type Country = { id: string; name: string; continent: ContinentCode; capital: string | null };
export const COUNTRIES = countriesJson as Record<string, Country>;

/** A camera target: the centre of the view and the angular radius (degrees) that should fit on screen. */
export type View = { center: LonLat; radius: number };

export const CONTINENTS: Record<ContinentCode, { name: string; view: View }> = {
  AF: { name: 'Africa', view: { center: [18, 2], radius: 38 } },
  AN: { name: 'Antarctica', view: { center: [0, -90], radius: 30 } },
  AS: { name: 'Asia', view: { center: [92, 36], radius: 46 } },
  EU: { name: 'Europe', view: { center: [14, 52], radius: 21 } },
  NA: { name: 'North America', view: { center: [-98, 42], radius: 40 } },
  OC: { name: 'Oceania', view: { center: [145, -22], radius: 30 } },
  SA: { name: 'South America', view: { center: [-60, -20], radius: 33 } },
};

export const WORLD_VIEW: View = { center: [12, 18], radius: 90 };

export type Place = {
  name: string;
  kind: Exclude<PlaceKind, 'continent' | 'country'>;
  view: View;
  /** Country (cca3) to highlight together with this place. */
  country?: string;
  continent?: ContinentCode;
  /** Point marker. */
  pin?: LonLat;
  /** Soft circular region, radius in degrees. */
  area?: { center: LonLat; radius: number };
  /** River course or mountain spine, west/source first. */
  line?: LonLat[];
  /** Where the label sits for lines/areas. */
  labelAt?: LonLat;
};

const city = (name: string, pin: LonLat, country: string, capital = false): Place => ({
  name,
  kind: capital ? 'capital' : 'city',
  pin,
  country,
  view: { center: pin, radius: 4.5 },
});

export const PLACES: Record<string, Place> = {
  // Cities
  shanghai: city('Shanghai', [121.47, 31.23], 'CHN'),
  paris: city('Paris', [2.35, 48.86], 'FRA', true),
  rome: city('Rome', [12.5, 41.9], 'ITA', true),
  berlin: city('Berlin', [13.4, 52.52], 'DEU', true),
  madrid: city('Madrid', [-3.7, 40.42], 'ESP', true),
  reykjavik: city('Reykjavik', [-21.94, 64.15], 'ISL', true),
  vienna: city('Vienna', [16.37, 48.21], 'AUT', true),
  budapest: city('Budapest', [19.04, 47.5], 'HUN', true),

  // Rivers (traced through the towns on their banks)
  nile: {
    name: 'Nile',
    kind: 'river',
    continent: 'AF',
    view: { center: [31.5, 16], radius: 17 },
    labelAt: [32.53, 15.6],
    line: [
      [33.2, 0.45], [32.3, 2.8], [31.6, 4.85], [31.4, 7.2], [31.65, 9.53], [32.4, 12.3],
      [32.53, 15.6], [33.98, 17.7], [33.32, 19.53], [31.9, 18.5], [30.48, 19.17],
      [30.4, 20.8], [31.33, 21.8], [32.9, 24.09], [32.64, 25.69], [31.18, 27.18],
      [31.24, 30.05], [30.4, 31.45],
    ],
  },
  amazon: {
    name: 'Amazon',
    kind: 'river',
    continent: 'SA',
    view: { center: [-61, -3], radius: 13 },
    labelAt: [-60, -3.1],
    line: [
      [-73.5, -4.5], [-73.25, -3.75], [-71.5, -4.1], [-69.94, -4.2], [-67.5, -3.4], [-64.7, -3.35],
      [-62.3, -3.6], [-60.0, -3.1], [-57.6, -2.7], [-55.5, -1.9], [-54.7, -2.43], [-52.6, -1.5],
      [-51.1, 0.0], [-49.5, 0.5],
    ],
  },
  yangtze: {
    name: 'Yangtze',
    kind: 'river',
    country: 'CHN',
    view: { center: [107, 30.5], radius: 16 },
    labelAt: [111.29, 30.69],
    line: [
      [91.0, 33.5], [94.5, 33.6], [97.3, 33.0], [98.7, 31.0], [99.0, 29.5], [99.6, 27.6],
      [100.2, 26.9], [101.7, 26.5], [103.0, 26.6], [104.6, 28.77], [105.44, 28.87],
      [106.55, 29.56], [107.4, 29.7], [108.4, 30.8], [111.29, 30.69], [112.2, 30.3],
      [113.1, 29.4], [114.3, 30.6], [116.0, 29.7], [117.05, 30.5], [118.8, 32.06],
      [119.45, 32.2], [121.9, 31.4],
    ],
  },
  danube: {
    name: 'Danube',
    kind: 'river',
    continent: 'EU',
    view: { center: [19, 46.5], radius: 10 },
    labelAt: [22.5, 44.6],
    line: [
      [8.5, 47.95], [9.99, 48.4], [12.1, 49.02], [13.46, 48.57], [14.29, 48.31], [16.37, 48.21],
      [17.11, 48.14], [18.9, 47.8], [19.04, 47.5], [18.68, 45.99], [19.85, 45.25],
      [20.46, 44.82], [22.5, 44.6], [22.87, 43.99], [25.95, 43.85], [27.26, 44.12],
      [28.0, 45.4], [28.8, 45.17], [29.7, 45.2],
    ],
  },

  // Mountains
  everest: {
    name: 'Mount Everest',
    kind: 'mountain',
    pin: [86.925, 27.988],
    country: 'NPL',
    view: { center: [86.925, 27.988], radius: 5 },
  },
  kilimanjaro: {
    name: 'Kilimanjaro',
    kind: 'mountain',
    pin: [37.355, -3.066],
    country: 'TZA',
    view: { center: [37.355, -3.066], radius: 6 },
  },
  montblanc: {
    name: 'Mont Blanc',
    kind: 'mountain',
    pin: [6.865, 45.833],
    continent: 'EU',
    view: { center: [6.865, 45.833], radius: 3.5 },
  },
  andes: {
    name: 'Andes',
    kind: 'range',
    continent: 'SA',
    view: { center: [-68, -20], radius: 33 },
    labelAt: [-68.5, -22],
    line: [
      [-71.0, 9.0], [-73.5, 6.5], [-75.5, 5.0], [-77.5, 1.5], [-78.5, -1.0], [-79.0, -4.5],
      [-77.5, -8.5], [-75.5, -11.0], [-73.0, -14.0], [-70.5, -16.5], [-68.5, -22.0],
      [-68.8, -27.0], [-70.0, -32.65], [-70.8, -36.0], [-71.5, -40.0], [-72.5, -46.0],
      [-73.3, -50.0], [-72.0, -53.5],
    ],
  },

  // Deserts & regions
  sahara: {
    name: 'Sahara',
    kind: 'desert',
    continent: 'AF',
    area: { center: [12, 23], radius: 13 },
    view: { center: [12, 21], radius: 26 },
  },
  atacama: {
    name: 'Atacama Desert',
    kind: 'desert',
    country: 'CHL',
    area: { center: [-69.6, -23.8], radius: 2.6 },
    view: { center: [-69.6, -23.8], radius: 8 },
  },
  gobi: {
    name: 'Gobi Desert',
    kind: 'desert',
    continent: 'AS',
    area: { center: [104, 43], radius: 6 },
    view: { center: [104, 43], radius: 14 },
  },
  ringoffire: {
    name: 'Ring of Fire',
    kind: 'region',
    view: { center: [-175, 18], radius: 72 },
    labelAt: [-160, 52],
    line: [
      [-73, -45], [-71, -30], [-77, -10], [-79, 0], [-84, 10], [-92, 15], [-104, 19],
      [-122, 40], [-122, 47], [-135, 58], [-150, 60], [-165, 54], [-180, 52], [165, 55],
      [158, 53], [150, 46], [142, 40], [137, 34], [131, 31], [124, 24], [122, 15],
      [125, 7], [127, 1], [140, -4], [147, -6], [160, -9], [168, -16], [-175, -20],
      [178, -30], [176, -39],
    ],
  },
};
