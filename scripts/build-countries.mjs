// Builds a compact country table (continent, capital, centre) from `world-countries`.
// Run with `npm run gen:countries`; the output is committed so the app ships without the full dataset.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const countries = JSON.parse(readFileSync(require.resolve('world-countries/countries.json'), 'utf8'));

function continentOf(c) {
  switch (c.region) {
    case 'Africa': return 'AF';
    case 'Europe': return 'EU';
    case 'Asia': return 'AS';
    case 'Oceania': return 'OC';
    case 'Antarctic': return 'AN';
    case 'Americas': return c.subregion === 'South America' ? 'SA' : 'NA';
    default: return null;
  }
}

const out = {};
for (const c of countries) {
  if (!c.ccn3) continue;
  const continent = continentOf(c);
  if (!continent) continue;
  out[c.cca3] = {
    id: c.ccn3,
    name: c.name.common,
    continent,
    capital: c.capital?.[0] ?? null,
  };
}

writeFileSync(new URL('../src/data/countries.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${Object.keys(out).length} countries`);
