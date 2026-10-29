# Flags Quiz — Continent breakdown on the world quiz result

Date: 2026-10-29
Status: implemented

## Reasoning

The world quiz result shows points, time, errors and the lists of missed and unanswered countries.
Across some 250 countries those lists do not tell the player where they are strong and where to study next.
A per-continent breakdown turns the result into a direction: which continents are mastered and which one to train.

## Goals

- At the end of a world quiz, flags of any level and the "Mundo inteiro" map quiz, show how each continent went.
- Point the player to the weakest continent with a button that opens its training.

## Non-goals

- No history across quizzes: the breakdown describes this quiz only.
- No breakdown by region inside a continent.
- No change to the result of a continent quiz.

## Decided (Adriano, 2026-10-29)

- **Metric.** A continent's score is the number of its countries answered right without any mistake, over its number of countries in the quiz, shown as a count and a percentage ("9/15 · 60%"). A country left unanswered on an early end counts as not right, so a continent with a pending country is never mastered.
- **Mastered.** A continent at 100% shows as a "✓ Europa 12/12" chip in a row of mastered continents.
- **The rest.** The other continents are listed weakest first, each with a bar of its percentage.
- **Study.** Under the list, "Estudar <continent> →" opens the weakest continent: for flags, Aprender at the same level; for maps, Início on that continent, where its region levels are.
- A continent with no country in the quiz is left out.

## Technical

- `src/engine/breakdown.ts`: `continentBreakdown(pool, unanswered, missed)` returns, per continent with countries in the pool, the right-first-time count and the total, weakest first.
- `src/ui/results.ts`: `continentReport(breakdown, study)` renders the mastered chips, the bars and the study button, shared by both result screens.
- `quizResult.ts` and `mapQuizResult.ts` render it when the continent is `world`, rebuilding the pool from `poolFor(countries, 'world', difficulty)` and `mapPool('world', MAP_ALL)`.

## Checklist

- [x] `continentBreakdown` with tests.
- [x] `continentReport` in both world result screens, with tests.
- [x] Styles for the chips and bars in light and dark.
