# Flags Quiz — Map Learn ladder design

Date: 2026-11-01
Status: implemented

## Reasoning

The Maps Learn formats were copied from the flag Learn mode, and they do not teach a map to someone who starts from zero.
Adriano played the África regions knowing none of the countries: "Onde fica X?" left him guessing until he hit, and each guess cost a life without teaching anything.
A flag can be learned from its own picture, but a country's place on a map cannot be guessed from its name.

What Adriano wants to learn is one skill: look at a highlighted country and say its name.
Maps Learn is rebuilt around that skill as a ladder per country.
The first step is answerable with no map knowledge, because it shows the country's flag, which Adriano already learned in Bandeiras.
Each step removes part of the help, and the last one asks for the name with nothing else.

## Goals

- Every question asks for an action from the player: no screen only shows information.
- A player who knows none of a region's countries can answer the first question about each of them.
- A medal means every country of the level can be named from its highlighted shape with no help.

## Non-goals

- No change to the Maps Quiz, the map table, the region levels or the flag and capital areas.
- No hint button: the help lives in the question itself.

## Anti-goals

- A question the player can only answer by guessing.
- A passive "presentation" screen that asks for nothing.

## Decided (Adriano, 2026-11-01)

- **The ladder.** Every country of the level climbs five steps. Each question highlights the country on the map:
  1. The country's flag is shown next to the map; the player picks its name among 4.
  2. The player picks the country's flag among 4 flags.
  3. The player picks its name among 4, with no flag (today's `mapToNames`).
  4. The letters of the name are shown shuffled as tiles; the player puts them in order.
  5. The player types the name with no help (today's `mapTypeName`).
- **Moving on the ladder.** A right answer moves the country one step up. A wrong answer moves it one step down (never below step 1) and costs one life.
- **Lives.** 3 lives, as today. Losing the last one ends the round as today, with the option to continue without a medal.
- **Medal.** The round is won when every country of the level has answered step 5 right. The medal is still set by the lives left (gold 3, silver 2, bronze 1).
- **Removed formats.** "Onde fica X?" (`nameToMap`), "Este é X?" (`mapTrueFalse`) and "Ligue cada nome ao país" (`mapPairs`) leave Maps Learn.
- **Order of countries.** No extra rule: the region levels already keep a round among neighbours.
- **Whole-map levels.** In "Continente inteiro" and "Mundo inteiro" every country starts at step 3, since those levels consolidate what the regions taught. A wrong answer can still drop a country to steps 2 and 1.

## Calls made without Adriano (check while reading)

- **Starting point.** Every round starts fresh from its level's starting step; nothing carries over between rounds.
- **Topped countries.** A country that answered step 5 right is done for the round and is not asked again.
- **Picking the next country.** At random among the countries not done yet, skipping the ones asked within the last `REVIEW_GAP` questions, as the flag Learn rounds do; when every remaining country is inside the gap, the gap is ignored.
- **Distractors.** Steps 1, 2 and 3 draw their 3 wrong options among the 8 nearest countries of the level's pool, as `mapToNames` does today. A pool with fewer than 4 countries is not possible: regions have at least 5.
- **Flags known.** Every map country is an entry of `countries.json` and is taught by some flag level (the flag Geral levels cover every tier), so step 1 needs no per-country start.
- **Letter tiles (step 4).** One tile per letter of the country's name, accents as written, shuffled, with no extra letters. Spaces, hyphens and apostrophes are not tiles: the answer slots show them in place, so the player sees the word lengths. Tapping a tile puts it in the next empty slot; tapping a placed letter sends it back. When every slot is filled the player confirms; the order is right only if it spells the name exactly, and typo forgiveness does not apply. Repeated letters are interchangeable.
- **Progress shown.** The top bar shows countries done out of the level size ("4/9") in place of correct answers out of the goal.
- **Saved medals.** Maps Learn medals earned under the old formats stay as they are; the storage keys do not change.
- **Feedback.** A wrong answer shows the existing map solution (the country painted and named) before moving on, as today.

## Technical

- `src/engine/mapFormats.ts`: the five steps become the Maps formats; step 1 and step 2 are new question shapes, step 4 is a new shape carrying the shuffled letters. The removed formats are deleted from Maps along with their renderers and tests, unless the flag area uses them.
- The step of each country is round state. Today's `Round` (`src/engine/round.ts`) picks a format by weight and wins on a correct-answer count, which does not fit; whether Maps gets its own round class or `Round` gains a ladder mode is left to the builder.
- `src/ui/questions/mapQuestions.ts`: renderers for the new shapes, reusing `renderNameChoices`, `renderTypeName` and the flag image helpers.
- `src/ui/screens/mapGame.ts` and the top bar: the "done / size" counter and the win condition.

## Testing

- Engine: a right answer climbs, a wrong one drops and costs a life, step 1 is the floor, step 5 right marks the country done, the round is won only when every country is done, the review gap, and the medal by lives left.
- Formats: each step builds its question with neighbour distractors; step 4 shuffles exactly the name's letters and grades repeated letters as interchangeable.
- DOM: each step renders and submits; the counter shows done out of size.
