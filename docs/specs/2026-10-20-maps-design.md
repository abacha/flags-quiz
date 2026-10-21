# Flags Quiz — Maps area

Date: 2026-10-20
Status: approved

## Reasoning

The app teaches flags. Adriano wants the same study loop for geography: see a country highlighted on a map and know its name.
Maps is a new area of the app, beside Bandeiras, with the same two modes: Aprender teaches through choice questions first, and Quiz asks the player to fill in every country of a continent.

## Goals

- A player picks a continent or Mundo and learns where each country is, then proves it by filling the whole map.
- The two modes feel like their flag counterparts: same top bar, lives, medal, timer, records and result screen shapes.
- The map works on a phone: pinch to zoom and drag to pan, so small countries such as Luxembourg, Malta, Andorra and the Caribbean islands stay playable.
- Works offline like the rest of the PWA.

## Non-goals

- No capitals, borders, rivers or any question beyond the country's name.
- No change to the flag modes.

## Anti-goals

- A country that cannot be reached by touch, even after zooming, appearing as a question.
- A map that needs network to render.

## Decided

**Hub.** A segmented selector "Bandeiras | Mapas" sits at the top of the hub. Bandeiras shows today's hub unchanged. Mapas shows the same continent tabs (África, Américas, Ásia, Europa, Oceania, Mundo) and, under the selected tab, the same four level cards as Bandeiras (Fácil, Médio, Difícil, Geral), each with the country count, the medal tag, the Quiz tag and the buttons Aprender and Quiz.

**Levels (Adriano's decision, after playing Américas).** Maps uses the flag tiers of `countries.json`: Fácil asks tier 1, Médio tier 2, Difícil tier 3 and Geral all of them, minus the excluded micro territories. On Fácil, Médio and Difícil the other countries of the continent are still drawn and tappable as usual, but they are never asked: in "Onde fica X?" tapping one of them is a wrong answer, and in the Quiz tapping one does nothing.

**Pool.** The entries of `countries.json` for that continent (all of them for Mundo), of every status: UN members, the states outside the UN and the territories, such as Greenland, Puerto Rico, New Caledonia and French Guiana. Micro territories are left out of Maps entirely.

**Quiz.** The Quiz of flags with the map in place of the grid: one country is highlighted, the player types its name, a correct answer paints the country and shows its name on it. Tapping another country moves the highlight to it, "Pular" moves to the next one, the timer runs, and best score, best time and completion are kept per continent and level. Typed answers are graded exactly as the flag modes grade them: `normalizeName` plus `aliases`.

**Aprender.** Same rules as the flag Learn mode (`2026-10-10-learn-choice-first-design.md`): each country is introduced through a choice question before any other format, 3 lives, a medal goal per level, the review gap and passes. Formats:

- Choice: country highlighted on the map with 4 names (`mapToNames`); name on screen, tap the country on the map (`nameToMap`); link names to lettered highlighted countries (`mapPairs`).
- Other: true or false, "Este é o Chile?" (`mapTrueFalse`); type the name of the highlighted country (`mapTypeName`).
- Crop, odd one out and the look-alike formats have no map counterpart and are not used.

**Zoom.** Pinch and drag on the map in every map question and in the Quiz.

**Initial view (Adriano's decision, after playing Américas).** The map takes at most about 45% of the screen height in a landscape frame, and zoom does the rest. A map question opens framed on the highlighted country and its surroundings (at least about 1500 km across); `mapPairs` frames its four countries; "Onde fica X?" keeps the whole continent so the answer is not given away. In the Quiz the map slides to each new highlighted country. The player can always zoom out to the whole continent.

## My calls (Adriano did not decide these)

- **Map data:** Natural Earth 1:50m admin-0 map units, bundled as TopoJSON, keyed to our `iso2`. Rendered as inline SVG with `d3-geo` (projection and paths) and `topojson-client`. One projection per continent fitted to its pool's bounding box; Mundo uses Equal Earth. Russia sits in Europe in `countries.json` and is drawn whole on the Europe map.
- **Micro territory rule:** an entry is left out of Maps when the area of its 1:50m polygons (`d3.geoArea`, converted to km²) is below 100 km², or when it has no polygon in the 1:50m data. A one-off script computes the list and the result is committed as `src/data/map-excluded.json`, edited by hand afterwards like the other data files. Jersey (about 118 km²) stays and Guernsey (about 63 km²) goes; the threshold is the rule and the committed file is the truth.
- **Russia on the Europe map:** the Europe projection is fitted to the pool without Russia; Russia is drawn and playable, and its eastern part runs off the edge of the initial view, reachable by panning. Mundo draws Russia whole.
- **Reach for small countries:** each pool country gets an invisible hit circle around its centroid with a minimum on-screen radius of 22 px, capped at half the distance to the nearest neighbouring centroid so it never picks up a neighbour. Maximum zoom is 24× the fitted view.
- **Distractors (Adriano's decision, after playing):** the wrong options of `mapToNames` and `mapTrueFalse`, and the three other countries of `mapPairs`, are drawn at random among the 8 countries of the level's pool nearest to the target (great-circle distance between centroids), so a question stays in one region and its frame stays tight. A pool too small to have 8 others uses all of them. The flag look-alike lists are not used in Maps.
- **Goal above pool size:** a Maps pool smaller than `MIN_GOAL` keeps the goal of 15. Learn rounds start a new pass once every country is spent, so the goal stays reachable.
- **United Kingdom (Adriano's decision):** Maps asks the four nations (`gb-eng`, `gb-sct`, `gb-wls`, `gb-nir`) as separate countries, drawn from the Natural Earth map units that split them, and leaves `gb` out of Maps.
- **Countries outside the pool on a continent map** (a neighbour drawn for context, such as Russia on the Asia map) are drawn in a neutral grey and cannot be tapped.
- **Highlight for small countries:** besides the fill, the highlighted country gets a circle marker around its centroid, so it is visible at any zoom.
- **Medal goal and Learn rules per level:** `goalFor(difficulty, pool.length)` and the level's `recallWeight` from `LEVEL_RULES`, as in Bandeiras, `MIN_GOAL` still 15; distractors come from the target's nearest neighbours in the level's pool.
- **Storage:** separate keys for Maps medals and Maps quiz records, keyed by continent and level like the flag keys, so flag progress is untouched. The hub header counter stays the flags counter while Bandeiras is selected and shows the Maps counter, counted the way the flag counter is, while Mapas is selected.
- **Selector memory:** the hub remembers the last selected area (Bandeiras or Mapas) the same way it remembers the continent.

## Left to the builder

- Exact TopoJSON simplification level, as long as the bundle stays reasonable for a PWA and coastlines stay recognizable at the zoom needed for Malta.
- The pinch/pan implementation (pointer events on an SVG `viewBox` is enough; a library is acceptable if it is small).
- How `mapPairs` labels the highlighted countries on the map.
- Visual style, within the app's existing tokens.

## Testing

- Data: every Maps pool entry has a polygon; every excluded entry is in `map-excluded.json`; no excluded entry appears in any map question or the Quiz.
- Engine: the map formats follow the choice-first rules, with the same tests as the flag Learn engine.
- Records and medals: Maps keys are written and read separately from the flag keys.
- Screens: hub selector, map Quiz and each map format in DOM tests; zoom and the layout checked at 390px in the browser.
