# Flags Quiz — Forgive typos in typed names

Date: 2026-10-30
Status: implemented

## Reasoning

The world flag quiz asks some 250 flags, and a player who wants a clean run restarts after any error.
A slip of the fingers such as "Agrentina" counts the same as not knowing the country, so a run is lost to typing and not to knowledge.
The game should refuse a misspelled answer without charging for it, and keep charging for a wrong country.

The hard part is telling a typo from a wrong country.
"Austria" is one letter away from "Australia", but confusing the two is a knowledge error, and the game already knows such look-alike names (`similar-names.json`).
The rule below treats an answer as a typo only when it names no country and sits clearly closer to the right one than to any other.

## Goals

- A typo in a typed name costs nothing: no error in Quiz, no life in Learn and Maps.
- The player sees the answer was refused for spelling, fixes it in place and submits again.
- Typing another country's name stays a wrong answer.

## Non-goals

- No change to which spellings count as right: names and aliases, with the current normalization (`normalizeName`).
- No autocorrect: a typo is never accepted as right.
- No change to choice, pairs, true/false or map-tap questions.

## Decided (Adriano, 2026-10-30)

- **What a typo is.** The normalized text is a typo for the target when all of these hold:
  - it is not the normalized name or alias of any country in `countries.json`;
  - its edit distance to the target's nearest name or alias is at most 2;
  - it is strictly closer to the target than to every other country (nearest name or alias of each).
  A tie with another country is a wrong answer.
- **Examples.** "Agrentina" for Argentina is a typo. "Austria" for Austrália is wrong, since Áustria is a country. "Australa" for Austrália is a typo, closer to Austrália than to Áustria. "Nigeria" for Níger is wrong.
- **Where.** Every place that takes a typed name: Quiz (flags and map), Learn "digite o nome" (`typeName`), Learn "digite os nomes parecidos" (`typeSimilar`) and Maps "digite o nome" (`mapTypeName`).
- **On a typo.** The answer is refused with "Confira a grafia". Nothing is charged: no error in Quiz, no life lost, no country added to the missed list, nothing counted toward progress or medal. The same question stays, with the typed text kept in the field. A player may make any number of typos on a question.
- **Several fields (`typeSimilar`).** If any field is a wrong answer, the whole answer is wrong, as today, whatever the other fields hold. Only the countries of the wrong fields go into the missed list; a typo field stays out of it, so it is neither reviewed nor listed as missed. If no field is wrong and at least one is a typo, the answer is refused as a typo and the typo fields are marked. Otherwise it is right.

## Calls made without Adriano (check while reading)

- **Edit distance** is Damerau–Levenshtein (optimal string alignment), so a swap of two adjacent letters ("Agrentina") costs 1.
- **Short names.** For a target name or alias of 5 characters or fewer (Peru, Chad, Irã, Togo), the limit is 1 edit instead of 2, so a short name does not forgive a different word.
- **Timer.** Quiz's timer keeps running while the player fixes a typo: a typo costs time, not points.
- **Message.** "Confira a grafia" replaces "Errado, tente de novo" in the same spot in Quiz; in Learn and Maps it shows under the field with no feedback sheet.

## Technical

- `src/engine/answer.ts`: a `judgeTypedName(country, text)` returning `'right' | 'typo' | 'wrong'` replaces the boolean `acceptsTypedName` at its call sites. It compares against every country in `countries.json`.
- `Grade` gains a typo outcome. `grade()` returns it for `typeName`, `mapTypeName` and `typeSimilar` (with the typo fields), following the multi-field rule above.
- `Round.answer` (`src/engine/round.ts`) on a typo keeps `current`, leaves lives, `correct` and `missed` untouched, and returns the typo grade.
- `Quiz.answer` (`src/engine/quiz.ts`) returns the three outcomes; a typo records no error and keeps the current flag.
- `game.ts`, `mapGame.ts`, `quiz.ts` and `mapQuiz.ts` show "Confira a grafia" on a typo and keep the question and the typed text. The question renderers (`typeName.ts`, `typeSimilar.ts`, the map typing question) need a way to show the message and mark fields without being rebuilt; the shape of that is left to the builder.

## Checklist

- [x] `judgeTypedName` with tests covering the examples above, ties, short names and aliases.
- [x] Typo outcome in `grade()` for the three typed formats, with tests, including the mixed `typeSimilar` cases.
- [x] `Round.answer` and `Quiz.answer` charge nothing on a typo, with tests.
- [x] Screens show "Confira a grafia" and keep the text, with tests.
