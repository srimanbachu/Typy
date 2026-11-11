# Typy: idea validation

**The idea:** a typing site where the text you type teaches you something (geography, anatomy, botany…) and a live visual (map, body diagram) follows along, so typing becomes a by-product of learning instead of a drill.

## Verdict

Worth building. The pain is real and the space is open, but the idea succeeds or fails on one question: **do people remember what they typed?** Build the MVP around measuring that.

## Why it's promising

- **The pain is real and common.** Random-word drills (Monkeytype, keybr) are great for speed but feel empty, and many typists say exactly what you said: chasing WPM makes them self-conscious and slower. Searches like "typing practice with real text" and "type books to practice typing" come up again and again.
- **Demand for meaningful text is already proven.** TypeLit.io (type classic novels) and TypeRacer (type quotes) both have loyal audiences. People *want* the words to mean something. Nobody pairs the text with a visual that teaches, and that pairing is your edge.
- **Natural audiences:** students (geography and anatomy exams), self-learners, and schools, which already buy typing software (typing.com and others) and would welcome one that covers curriculum at the same time.
- **"Spaces" scale well.** Each subject is a content pack plus one visual (map, skeleton, muscle chart, plant), so the engine is built once.

## Risks, and how to handle them

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| **Copying ≠ learning** | Transcribing text is weak for memory. Research on the testing and generation effects shows recall beats re-reading. | Add **recall modes** next: the map lights up a country and you type its name; cloze passages with place names blanked out. This turns Typy from "typing with facts" into "active recall with a keyboard", which is the real differentiator. |
| **Split attention** | Reading for meaning while typing fast competes for attention, so WPM may drop. | Frame it honestly: the goal is fluency, not a WPM record. Show WPM, but put "places learned" first on the results screen (the MVP already does this). |
| **Content cost and accuracy** | Every space needs accurate, well-written passages and visuals. Anatomy needs licensed or custom illustrations. | Keep the markup format (`{text\|ref}`) simple so content can be written fast, and have each pack reviewed. Geography is cheapest (open data), so it's the right first space. |
| **Retention** | Novelty fades after a few lessons. | Spaced review of places you missed, daily "trip" lessons, and progress maps ("you've visited 42 countries"). |

## What to measure in the MVP

1. **Completion:** % of started lessons finished, and lessons per session.
2. **Recall:** a 3-question check after a lesson ("Which country is Kilimanjaro in?"). This is the metric that proves the thesis.
3. **Return rate:** day-1 and day-7.
4. **Qualitative:** does it feel *less* stressful than Monkeytype? Ask 10 typists.

## MVP scope (built)

- Geography space with 6 lessons (continents, rivers, European capitals, mountains, deserts, islands and volcanoes).
- Apple-style globe that flies to the continent, country, city, river or mountain you are typing about, with a soft blurred fade at the bottom edge.
- Typing area with place names underlined; the active place lights up in sync with the map.
- 3/4-view keyboard colour-coded by finger, with fingertips that reach for the next key (and Shift with the opposite pinky).
- Results screen: WPM, accuracy, mistakes, and the places you travelled through (click one to revisit it on the globe).

## Suggested next steps

1. Recall mode (map → type the name). Highest value.
2. More geography packs, plus state/province highlighting (Natural Earth admin-1 data).
3. Accounts and progress map.
4. Second space: bones (a skeleton SVG with highlightable regions uses the same focus/ref engine).
