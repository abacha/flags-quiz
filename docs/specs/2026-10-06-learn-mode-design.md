# Flags Quiz — Learn mode design

Date: 2026-10-06
Status: approved

## Goal

A personal study tool for learning world flags.
The app has two modes, Learn and Quiz; this spec covers Learn only.
The first continent is Africa, with every country name shown in Brazilian Portuguese.

Success means a player can pick Africa and a difficulty, play rounds of mixed question formats, and earn a medal per difficulty by reaching 10 correct answers before losing 3 lives.

## Scope

In scope:

- Learn mode, Africa only, three difficulties.
- Nine question formats (listed below).
- Medals persisted in the browser.
- Flag SVGs for every country in the world, because the "odd one out" format needs non-African flags.

Out of scope:

- Quiz mode (the home screen shows it as disabled, "em breve").
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
Flags keep their real aspect ratios (Nepal is not a rectangle, Switzerland is square); the UI fits them into a fixed box with `object-fit: contain`.

### Countries

`src/data/countries.json` holds one entry per country:

```json
{ "iso2": "cd", "name": "República Democrática do Congo", "continent": "africa", "tier": 2, "aliases": ["RDC", "Congo-Kinshasa"] }
```

- The country list is the UN member states from the `mledoze/countries` dataset, whose `region` field gives the continent.
- `name` is generated once from `Intl.DisplayNames('pt-BR', { type: 'region' })` by the same throwaway script, then corrected where the output is wrong: "Congo - Kinshasa" becomes "República Democrática do Congo" and "Mianmar (Birmânia)" becomes "Mianmar". `Intl` spells Burquina Faso and Malaui the Itamaraty way; those names stay, and "Burkina Faso" and "Malawi" become aliases. The committed file is the source of truth; the app never calls `Intl` at runtime.
- `tier` exists only for African countries.
- `aliases` lists extra accepted spellings for the "type the name" format.
- Africa means the 54 UN member states. Western Sahara and Somaliland are excluded.

### Similar-flag groups

`src/data/similar-groups.json` lists groups of 2 to 4 African flags that are easy to confuse.
It is curated by hand.

## Difficulty

Difficulty decides only which countries are in the pool. Every format can appear at every difficulty.
Tiers are cumulative:

| Difficulty | Pool |
|---|---|
| Fácil | tier 1 (18 countries) |
| Médio | tiers 1–2 (36 countries) |
| Difícil | tiers 1–3 (54 countries) |

All three difficulties are always unlocked.

## Question formats

Every format is one question: it costs one life when wrong and counts one correct answer when right.

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

Rules per format:

- **Options count.** Formats 1 and 2 draw 4 or 6 options at random per question.
- **Distractors.** Wrong options come from the current pool at random. Format 8 draws its intruder from all non-African countries.
- **True or false.** The shown name matches the flag with 50% probability.
- **Type the name.** No autocomplete. The answer is correct when it equals the country name or one of its aliases after normalization: lowercase, accents stripped, hyphens turned into spaces, whitespace collapsed and trimmed. Typos are not forgiven.
- **Crop.** The crop covers about 50% of the flag's area at a random position. The risk of a crop landing on a plain stripe is checked in the browser against striped flags such as Gabão and Serra Leoa before the format is accepted.
- **Match pairs and sort similar.** The player taps a name, then a flag, to link them; tapping a linked pair unlinks it. A "conferir" button submits. Any wrong link makes the whole question wrong.
- **Eligibility.** A format enters the draw only when the pool can build it. Sort similar needs a group with at least 2 members inside the pool, and uses only those members.

## Round rules

- A round starts with 3 lives and 0 correct answers.
- Each question draws a format uniformly from the formats that can target at least one unused country, then a target uniformly from the unused countries that format can target.
- A country is not the target of more than one question in the same round.
- A wrong answer costs 1 life. The app then shows the correct answer (flag and name, or the full correct pairing) and waits for "continuar". A correct answer gets brief feedback and the same "continuar".
- 10 correct answers win the round and award the medal for that continent and difficulty.
- Losing all 3 lives ends the round.

## Progress

Medals are stored in `localStorage` under one key, as a map of `continent → difficulty → true`.
A medal is never removed by losing a later round.

## Screens

1. **Home.** Learn button; Quiz button disabled with "em breve".
2. **Continent.** Africa active; the other continents disabled.
3. **Difficulty.** Fácil, Médio, Difícil, each showing its medal when earned.
4. **Game.** Lives as hearts and the correct-answer count (for example "3/10") at the top, the question below, then the feedback panel after answering.
5. **Result.** On a win: the medal, "jogar de novo" and "voltar". On a loss: the number of correct answers and the list of flags missed in the round, each with its name.

Layout is mobile-first and responsive, with a light and a dark theme that follow the system preference.

## Architecture

```
src/
  data/            countries.json, similar-groups.json, typed loaders
  engine/
    rng.ts         seedable random source
    pool.ts        countries for a continent and difficulty
    question.ts    Question, Format and FormatContext types
    formats.ts     the nine formats, each with canTarget(target, ctx) and build(target, ctx, rng)
    round.ts       round state: lives, correct count, used targets, next question, answer
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
- eligibility, including sort similar against each difficulty's pool;
- round rules: life loss, win at 10, loss at 0 lives, no repeated target;
- name normalization and aliases;
- medal persistence.

The UI is checked by running the app in a browser and playing each format.

## Tiers and similar-flag groups

The lists below were reviewed and approved on 2026-10-06; `countries.json` and `similar-groups.json` encode them.

### Tiers

- **Tier 1 (Fácil):** África do Sul, Egito, Marrocos, Nigéria, Quênia, Etiópia, Gana, Argélia, Tunísia, Moçambique, Angola, Uganda, Tanzânia, Somália, Zimbábue, Senegal, Camarões, Madagascar.
- **Tier 2 (Médio adds):** Líbia, Sudão, Sudão do Sul, Costa do Marfim, Mali, Guiné, Ruanda, Botsuana, Namíbia, Zâmbia, Malaui, Lesoto, Essuatíni, Cabo Verde, Eritreia, Burquina Faso, República Democrática do Congo, Seicheles.
- **Tier 3 (Difícil adds):** Benin, Burundi, Chade, Comores, Djibuti, Gabão, Gâmbia, Guiné-Bissau, Guiné Equatorial, Libéria, Mauritânia, Maurício, Níger, República Centro-Africana, República do Congo, São Tomé e Príncipe, Serra Leoa, Togo.

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
