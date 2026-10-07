# Flags Quiz — Learn mode design

Date: 2026-10-06
Status: approved

## Goal

A personal study tool for learning world flags.
The app has two modes, Learn and Quiz; this spec covers Learn only.
The first continent is Africa, with every country name shown in Brazilian Portuguese.

Success means a player can pick Africa and a level, play rounds of mixed question formats, and earn a medal per level by reaching the level's goal of correct answers before losing 3 lives.

## Scope

In scope:

- Learn mode, Africa only, four levels: Fácil, Médio, Difícil and Geral.
- Eleven question formats (listed below).
- Keyboard shortcuts for the formats where a single key maps to an answer.
- Medals persisted in the browser.
- Flag SVGs for every country in the world, because the "odd one out" format needs non-African flags.

Out of scope:

- Quiz mode, specified in docs/specs/2026-10-06-quiz-mode-design.md.
- Other continents (the continent screen shows them as disabled).
- Backend, accounts, cross-device sync.
- Hosting beyond running locally on forge.

## Stack

- Vite + TypeScript, no UI framework; screens render with plain DOM.
- Vitest for unit tests.
- Static build output in `dist/`, served locally on forge.

## Data

### Flags

A throwaway script (run once, never committed) downloads every country's SVG from flagcdn into `public/flags/<iso2>.svg`.
The files are committed, so the app works offline.
Flags keep their real aspect ratios (Nepal is not a rectangle, Switzerland is square). The UI scales each flag to fit its slot at its own aspect ratio and draws a thin edge around the flag itself, so white areas stay visible on white cards.

### Countries

`src/data/countries.json` holds one entry per country:

```json
{ "iso2": "cd", "name": "República Democrática do Congo", "continent": "africa", "tier": 2, "aliases": ["RDC", "Congo-Kinshasa"] }
```

- The country list is the UN member states from the `mledoze/countries` dataset, whose `region` field gives the continent.
- `name` is generated once from `Intl.DisplayNames('pt-BR', { type: 'region' })` by the same throwaway script, then corrected where the output is wrong: "Congo - Kinshasa" becomes "República Democrática do Congo" and "Mianmar (Birmânia)" becomes "Mianmar". `Intl` spells Burquina Faso and Malaui the Itamaraty way; those names stay, and "Burkina Faso" and "Malawi" become aliases. Other accepted spellings: Botswana, Djibouti, Jibuti, Benim, Zimbabwe, Lesotho, Seychelles, Ilhas Maurício, Ilhas Comores. The committed file is the source of truth; the app never calls `Intl` at runtime.
- `tier` exists only for African countries.
- `aliases` lists extra accepted spellings for the "type the name" format.
- Africa means the 54 UN member states. Western Sahara and Somaliland are excluded.

### Similar-flag groups

`src/data/similar-groups.json` lists groups of 2 to 4 African flags that are easy to confuse.
It is curated by hand.

## Levels

A level decides which countries are in the pool, how many correct answers win, and how hard the questions lean.
Fácil, Médio and Difícil hold disjoint tiers; Geral holds all of Africa.

| Level | Pool | Correct answers to win | Recall weight | Similar distractors |
|---|---|---|---|---|
| Fácil | tier 1 (18 countries) | 12 | 1 | no |
| Médio | tier 2 (18 countries) | 18 | 2 | no |
| Difícil | tier 3 (18 countries) | 25 | 3 | yes |
| Geral | tiers 1–3 (54 countries) | 30 | 3 | yes |

- Every level starts with 3 lives.
- **Recall weight** multiplies the draw chance of the recall formats (type the name, type the name from a crop, type the similar flags); every other format has weight 1.
- **Similar distractors**: when on, every format that draws wrong options from the pool takes the target's similar-flag group members in the pool first and fills the rest at random. True or false shows a group member as the mismatched name when the target has one in the pool.
- All four levels are always unlocked.

## Question formats

Every format is one question: it costs one life when wrong and counts one correct answer when right.
Formats 5, 10 and 11 are the recall formats.

| # | Format | Shows | Player does |
|---|---|---|---|
| 1 | Name → flags | a country name and 4 or 6 flags | clicks the matching flag |
| 2 | Flag → names | a flag and 4 or 6 names | clicks the matching name |
| 3 | Flag → 2 names | a flag and 2 names | clicks the matching name |
| 4 | True or false | a flag and a name: "Esta é a bandeira de X?" | answers sim or não |
| 5 | Type the name | a flag | types the country name |
| 6 | Crop | an enlarged crop of a flag and 4 names | clicks the matching name |
| 7 | Match pairs | 4 flags and 4 names | links each name to its flag, then submits |
| 8 | Odd one out | 4 flags, 3 from the pool and 1 from another continent | clicks the flag that is not African |
| 9 | Sort similar | 2 to 4 flags from one similar-flag group and their names | links each name to its flag, then submits |
| 10 | Crop → type | an enlarged crop of a flag | types the country name |
| 11 | Type the similar flags | 2 to 4 flags from one similar-flag group, each with a text field | types every country name, then submits |

Rules per format:

- **Options count.** Formats 1 and 2 draw 4 or 6 options at random per question.
- **Distractors.** Wrong options come from the current pool, at random or similar-first depending on the level. Format 8 draws its intruder from all non-African countries.
- **True or false.** The shown name matches the flag with 50% probability.
- **Typed answers (formats 5, 10, 11).** No autocomplete. The answer is correct when it equals the country name or one of its aliases after normalization: lowercase, accents stripped, hyphens turned into spaces, whitespace collapsed and trimmed. Typos are not forgiven.
- **Crop (formats 6 and 10).** The crop covers about 25% of the flag's area (half its width and half its height, a 2× zoom) at a random position; 50% (√2 zoom) showed nearly the whole flag on a phone. The risk of a crop landing on a plain stripe is checked in the browser against striped flags such as Gabão and Serra Leoa before the format is accepted.
- **Match pairs and sort similar.** The player links a name and a flag by tapping them in either order: name then flag, or flag then name. The selected item has a strong highlight, and each linked flag shows its name under it. Tapping a linked name or flag unlinks it and selects it. A "conferir" button submits. Any wrong link makes the whole question wrong.
- **Type the similar flags.** Every field must be filled before submitting. Each field is graded like format 5; any wrong field makes the whole question wrong, and only the wrong ones count as missed.
- **Eligibility.** A format enters the draw only when the pool can build it. Sort similar and type the similar flags need a group with at least 2 members inside the pool, and use only those members.

## Round rules

- A round starts with 3 lives and 0 correct answers.
- Each question draws a format from the formats that can target at least one candidate country, weighted by the level's recall weight, then a target uniformly from the candidates that format can target.
- **Passes.** The candidates are the pool countries not yet spent in the current pass. When no candidate is left, a new pass starts: every country is a candidate again, and while countries missed in the round remain unspent in the new pass, only they are candidates.
- **Spent countries.** A question spends its target. Sort similar and type the similar flags spend every country they show, so the same group does not come back through another member in the same pass.
- A wrong answer costs 1 life. The app then shows the correct answer (flag and name, or the full correct pairing) and waits for "continuar".
- A correct answer shows only "Certo!" and "continuar".
- Reaching the level's goal wins the round and awards the medal for that continent and level.
- Losing all 3 lives ends the round.

## Keyboard shortcuts

- Choice formats with one answer (1, 2, 6, 8): keys 1–6 pick the option in display order; each option shows its number on devices with a hover-capable pointer.
- Two-option formats (3, 4): ← picks the first option or "Sim", → the second option or "Não"; 1 and 2 also work.
- Feedback panel: Enter or Space triggers "continuar" (the button has focus).
- Typed formats (5, 10, 11): Enter submits; no other shortcut, so typing is never hijacked.
- Pairs formats (7, 9): no shortcuts.

## Progress

Medals are stored in `localStorage` under one key, as a map of `continent → level → true` (levels `easy`, `medium`, `hard`, `general`).
A medal is never removed by losing a later round.

## Screens

1. **Home.** Learn and Quiz buttons.
2. **Continent.** Africa active; the other continents disabled.
3. **Level.** Fácil, Médio, Difícil, Geral, each showing its country count, its goal and its medal when earned.
4. **Game.** Lives as hearts and the correct-answer count against the level's goal (for example "3/12") at the top, a "Sair" link that abandons the round without a medal, the question below, then the feedback panel after answering.
5. **Result.** On a win: the medal, "jogar de novo" and "voltar". On a loss: the number of correct answers against the goal and the list of flags missed in the round, each with its name.

Layout is mobile-first and responsive, with a light and a dark theme that follow the system preference.

## Architecture

```
src/
  data/            countries.json, similar-groups.json, typed loaders
  engine/
    rng.ts         seedable random source
    pool.ts        levels: rules per level and the countries for a continent and level
    question.ts    Question, Format and FormatContext types
    formats.ts     the eleven formats, each with canTarget(target, ctx) and build(target, ctx, rng)
    round.ts       round state: lives, correct count, passes and spent countries, next question, answer
    answer.ts      answer checking, including the name normalization for format 5
  progress.ts      medal read/write over localStorage
  ui/
    screens/       home, continent, difficulty, game, result
    questions/     one renderer per format
  main.ts          screen routing
```

The engine has no DOM dependency. A `Question` is plain data that a format module builds and a renderer displays; the renderer reports the player's answer back to `round.ts`.

## Testing

Vitest covers the engine with a fixed seed:

- each format builds a valid question from a pool (correct answer present, no duplicate options, option count right, intruder off-continent);
- eligibility, including the group formats against each level's pool;
- similar-first distractors;
- round rules: life loss, win at the level's goal, loss at 0 lives, no repeat inside a pass, missed countries first in a new pass, group formats spending their whole group, recall weighting;
- name normalization and aliases;
- medal persistence.

The UI is checked by running the app in a browser and playing each format.

## Tiers and similar-flag groups

The lists below were reviewed and approved on 2026-10-06; `countries.json` and `similar-groups.json` encode them.

### Tiers

- **Tier 1 (Fácil):** África do Sul, Egito, Marrocos, Nigéria, Quênia, Etiópia, Gana, Argélia, Tunísia, Moçambique, Angola, Uganda, Tanzânia, Somália, Zimbábue, Senegal, Camarões, Madagascar.
- **Tier 2 (Médio):** Líbia, Sudão, Sudão do Sul, Costa do Marfim, Mali, Guiné, Ruanda, Botsuana, Namíbia, Zâmbia, Malaui, Lesoto, Essuatíni, Cabo Verde, Eritreia, Burquina Faso, República Democrática do Congo, Seicheles.
- **Tier 3 (Difícil):** Benin, Burundi, Chade, Comores, Djibuti, Gabão, Gâmbia, Guiné-Bissau, Guiné Equatorial, Libéria, Mauritânia, Maurício, Níger, República Centro-Africana, República do Congo, São Tomé e Príncipe, Serra Leoa, Togo.

### Similar-flag groups

- Mali, Guiné, Senegal, Camarões — vertical green-yellow-red tricolors.
- Costa do Marfim, Níger — orange-white-green.
- Egito, Sudão — red-white-black horizontal.
- Gana, Etiópia, Burquina Faso — pan-African horizontal bands.
- Guiné-Bissau, Benin, Togo — vertical band plus horizontal yellow/green or stripes.
- Tanzânia, República do Congo, Namíbia, República Democrática do Congo — diagonal bands.
- Quênia, Sudão do Sul, Malaui — black-red-green with white fimbriation or rising sun.
- Gabão, Serra Leoa — green-yellow/white-blue horizontal tricolors.
- Djibuti, Eritreia — hoist triangle over two horizontal bands.
- São Tomé e Príncipe, Guiné Equatorial — hoist triangle over green bands.
