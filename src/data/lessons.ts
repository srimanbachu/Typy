/**
 * Lessons are plain text with inline place references: `{visible text|ref}`.
 * A ref is a continent code (AF), a country code (EGY), or a key from PLACES (nile).
 * While the typist is inside or past a reference, the map shows that place.
 * Keep text ASCII-only so every character can be typed on a standard keyboard.
 */
export type Lesson = { id: string; title: string; blurb: string; source: string };

export const LESSONS: Lesson[] = [
  {
    id: 'continents',
    title: 'Seven Continents',
    blurb: 'The big picture',
    source:
      'Earth has seven continents. {Asia|AS} is the largest and the most populous of them all. ' +
      '{Africa|AF} comes second in both size and population. ' +
      '{North America|NA} stretches from the Arctic to the tropics, and {South America|SA} holds the vast Amazon rainforest. ' +
      '{Europe|EU} is small but crowded with nations. ' +
      '{Oceania|OC} is built around {Australia|AUS}, and frozen {Antarctica|AN} has no permanent residents at all.',
  },
  {
    id: 'rivers',
    title: 'Great Rivers',
    blurb: 'Water that shaped nations',
    source:
      'The {Nile|nile} flows north for more than six thousand kilometers before reaching the sea in {Egypt|EGY}. ' +
      'In {South America|SA}, the {Amazon|amazon} carries more water than any other river on Earth, crossing {Brazil|BRA} to the Atlantic. ' +
      'The {Yangtze|yangtze} is the longest river in {Asia|AS}, and it meets the sea in {China|CHN} at {Shanghai|shanghai}. ' +
      'The {Danube|danube} flows through ten countries, more than any other river, passing the capitals {Vienna|vienna} and {Budapest|budapest}.',
  },
  {
    id: 'capitals',
    title: 'Capitals of Europe',
    blurb: 'Where nations are run',
    source:
      'The capital of {France|FRA} is {Paris|paris}, a city built on the river Seine. ' +
      '{Italy|ITA} is governed from {Rome|rome}, a city that surrounds {Vatican City|VAT}, the smallest country in the world. ' +
      '{Berlin|berlin} became the capital of a reunited {Germany|DEU} in 1990. ' +
      'In the middle of {Spain|ESP} lies {Madrid|madrid}, one of the highest capitals in Europe. ' +
      'Far to the north, {Reykjavik|reykjavik} in {Iceland|ISL} is the northernmost capital of a sovereign state.',
  },
  {
    id: 'mountains',
    title: 'Mountains',
    blurb: 'The roof of the world',
    source:
      '{Mount Everest|everest} rises 8,849 meters above sea level on the border of {Nepal|NPL} and {China|CHN}. ' +
      'The {Andes|andes} form the longest mountain range on any continent, running down the western edge of {South America|SA}. ' +
      '{Kilimanjaro|kilimanjaro} in {Tanzania|TZA} is the highest peak in {Africa|AF}, a lone volcano that stands apart from any range. ' +
      'In the Alps, {Mont Blanc|montblanc} sits on the border between {France|FRA} and {Italy|ITA}.',
  },
  {
    id: 'deserts',
    title: 'Deserts',
    blurb: 'Dry, vast, and cold',
    source:
      'The {Sahara|sahara} is the largest hot desert on Earth, stretching across northern {Africa|AF} from the Atlantic Ocean to the Red Sea. ' +
      'Yet the largest desert of all is {Antarctica|AN}, because so little snow falls there each year. ' +
      'The {Atacama|atacama} in {Chile|CHL} is one of the driest places on the planet. ' +
      'Across {Mongolia|MNG} and northern {China|CHN} spreads the {Gobi|gobi}, a cold desert of rock and gravel.',
  },
  {
    id: 'islands',
    title: 'Islands & Fire',
    blurb: 'Ice, plates, and volcanoes',
    source:
      '{Greenland|GRL} is the largest island in the world, and most of it lies under a thick sheet of ice. ' +
      '{Iceland|ISL} sits on the Mid-Atlantic Ridge, where two tectonic plates are slowly pulling apart. ' +
      'On the other side of the globe, {Japan|JPN} is part of the {Ring of Fire|ringoffire}, a horseshoe of volcanoes around the Pacific Ocean. ' +
      '{Indonesia|IDN} has more active volcanoes than any other country, spread across thousands of islands.',
  },
];
