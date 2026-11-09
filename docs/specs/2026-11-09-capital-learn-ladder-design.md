# Flags Quiz — Capital Learn ladder design

Date: 2026-11-09
Status: draft

Changes `docs/specs/2026-10-30-capitals-design.md` (Aprender) and `docs/specs/2026-11-01-map-learn-ladder-design.md` (step 4).

## Reasoning

Capitais Aprender copied the choice-first rules of the flag Learn mode, and they do not teach a capital to someone who starts from zero.
A flag choice question teaches because the flag itself is on screen beside its name.
A capital has no such cue: "Qual é a capital do Irã?" with Teerã, Bagdá, Cabul and Damasco is a guess for a player who knows none of them, and the tricky distractors, which are the point of the area, make the first contact worse.
Adriano plays it as trial and error.

Maps had the same problem and solved it with a ladder per country whose first step bridges from something the player already knows.
Capitais gets the same shape.
The bridge is the map: the capital is drawn as a point inside its country, and the player already knows where each country lies from Mapas.

What Adriano wants to know at the end is both directions: see a country and type its capital, and see a capital and type its country.

While here, the letter-tiles step leaves the Maps ladder: Adriano found it does not help.

## Goals

- A player who knows none of a level's capitals can answer the first question about each of them.
- A Capitais medal means every country of the level was typed from its capital, and every capital from its country, after the help was gone.
- Every question asks for an action: no screen only shows information.

## Non-goals

- No change to how the Capitais Quiz plays, to the capital names and coordinates, or to the flag area.
- No new level names: Capitais keeps its continent tabs and the Fácil, Médio, Difícil and Geral cards; only their contents change.

## Anti-goals

- A first question the player can only answer by guessing.
- A passive "presentation" screen that asks for nothing.

## Decided (Adriano, 2026-11-09)

- **The capital ladder.** Every country of the level climbs four steps:
  1. **Map bridge.** A map shows the capital as a point, labelled with its name; the player picks, among 4, the country it lies in.
  2. **Country → capital, choice.** The country is shown; the player picks its capital among 4, with today's tricky distractors (`countryToCapitals`).
  3. **Type the capital** of the country shown (`typeCapital`).
  4. **Type the country** of the capital shown (`typeCapitalCountry`).
- **Moving on the ladder, lives and medal.** As in Maps: a right answer climbs one step, a wrong one drops one step (never below step 1) and costs a life; 3 lives, the option to continue without a medal, and the round is won when every country has answered step 4 right, with the medal set by lives left.
- **Removed from Capitais Aprender:** `capitalToCountries`, `capitalPairs` and `capitalTrueFalse`.
- **Capitais asks the Mapas countries only.** Following the map pool decision of 2026-11-04 (every sovereign state plus eight chosen territories), the Capitais pool of a continent is its Mapas pool. The other territories leave Capitais entirely: Aprender, Quiz, Geral and the capital table. A point on the map for a place the player never saw in Mapas would be a guess.
- **Levels redistributed.** The flag tiers left some Capitais levels nearly empty once the territories left (Oceania Difícil 0 countries, Américas Difícil 5). Each continent's Capitais countries are split into three levels of equal size, Fácil, Médio and Difícil, keeping the flag order from easy to hard. Geral is the whole continent. Mundo Fácil, Médio and Difícil are the union of the continents' levels of the same name; Mundo Geral is every Capitais country.
- **Where Aprender exists.** On every Fácil, Médio and Difícil level of each continent (Oceania 5 or 6 countries per level, Américas 13, the others 16 to 19). Geral offers only the Quiz, as today. Mundo Fácil, Médio and Difícil (about 80 countries) lose Aprender and offer only the Quiz, as the whole-map levels of Maps do.
- **Maps ladder.** The letter-tiles step (`mapSpellName`) is removed; the Maps ladder becomes flag beside the map → find the country on the map → pick its name → type its name.

## Calls made without Adriano (check while reading)

- **Bridge options.** The 3 wrong countries of step 1 are the countries of the level's pool whose capitals are nearest the target's (`nearestByCapital`). Tricky look-alikes do not apply here: the point on the map is the cue, and neighbours are what make the map worth reading.
- **Bridge map.** The continent map, zoomed on the target country and its surroundings exactly as the Maps questions focus a highlighted country (`view.focus` in `src/ui/questions/mapQuestions.ts`). The target country is not painted: the point alone places it. The options are buttons with each country's flag and name, so the distractor countries need not be inside the frame.
- **Starting point.** Every round starts each country at step 1; nothing carries over between rounds.
- **Topped countries, next country, review gap and typos** follow the Maps ladder: a country that answered step 4 right is done for the round; the next country is drawn among the lowest-step open countries outside `REVIEW_GAP`; a typo on steps 3 and 4 is refused with "Confira a grafia" and costs nothing.
- **Level lists are hand-kept data.** The split lives in a new `src/data/capital-levels.json`, continent → `easy`/`medium`/`hard` → `iso2` list, as `map-regions.json` does for Maps. The builder seeds it by sorting each continent's Capitais countries by flag tier and cutting into thirds (sizes differ by at most one, larger levels first), then moves countries across a boundary only to keep a well-known capital out of Difícil or an obscure one out of Fácil. A test pins that every Capitais country sits in exactly one level of its continent. Adriano reviews the lists before the merge.
- **Progress and goal.** The top bar shows countries done out of the level size, and the hub medal tag shows that size as the goal, as Maps does.
- **Saved progress.** No storage key changes, following the map pool precedent: Capitais and Maps medals and Capitais quiz records earned on the old level contents stay as they are, completion flags included. Mundo Capitais medals stay stored and are no longer shown, since those cards lose the medal tag with Aprender.
- **Feedback.** A wrong answer shows the existing capital revelation (flag, name, badge and every capital) before moving on.

## Technical

- `src/engine/ladderRound.ts` already drives Maps with a ladder of formats; Capitais Aprender moves onto it with a capital ladder, replacing `Round` in `src/ui/screens/capitalGame.ts`.
- `src/engine/capitalFormats.ts`: a new step-1 format and question shape; delete `capitalToCountries`, `capitalPairs` and `capitalTrueFalse` with their renderers, grading and tests, since nothing else uses them.
- `src/ui/questions/capitalQuestions.ts`: the step-1 renderer, drawing the capital point with the map module in `src/ui/map/map.ts`.
- `src/engine/mapFormats.ts`: drop `mapSpellName` from `MAP_LADDER` and delete it with its renderer (`src/ui/questions/spellName.ts`), grading and tests.
- `src/data/capitals.ts`: `capitalPool(continent, difficulty)` reads `capital-levels.json`; every other Capitais caller (Quiz, table, hub, typed-capital grading) goes through it or through the Mapas pool.
- `src/ui/screens/hub.ts`: `capitalLevelCard` offers Aprender only off Mundo and Geral, with the level size as the goal.

## Testing

- Data: every Capitais country sits in exactly one level of its continent, the three levels of a continent differ in size by at most one, and the Capitais pool of a continent equals its Mapas pool minus `capitals-excluded.json`.
- Engine: the capital ladder climbs, drops, floors at step 1, finishes a country at step 4 and wins only when every country is done; the step-1 options are the target plus 3 pool countries nearest by capital.
- Maps: the ladder has four steps and never asks `mapSpellName`.
- DOM: the step-1 question renders the map with the capital point and its name and submits a choice; the capital top bar shows done out of size; the hub shows no Aprender on Mundo or Geral in Capitais.
- Browser: an Oceania Fácil round and an Américas Difícil round of Capitais played at 390px, the second to see the Caribbean framing.

## Checklist

- [ ] Capitais pool is the Mapas pool, split by `capital-levels.json`
- [ ] Step-1 format, question shape and renderer
- [ ] Capitais Aprender on `LadderRound` with the four-step ladder
- [ ] Removed capital formats deleted from engine, rendering, grading and tests
- [ ] `mapSpellName` removed from the Maps ladder and deleted
- [ ] Hub: no Capitais Aprender on Mundo; goal is the level size
- [ ] `npx vitest run` and `npx tsc --noEmit` pass
- [ ] Played in the browser
