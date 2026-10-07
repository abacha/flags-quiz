# World and Territories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 55 flagcdn flags outside the UN with a status badge, re-tier every continent over UN and non-UN flags together, add Mundo as a sixth choice, and make navigation continent-first with "Aprender" and "Quiz" on each level.

**Architecture:** Data gains a `status` field, 55 entries, new tiers and look-alike groups. The engine gains a `ContinentKey = Continent | 'world'` that `poolFor`, medals and Quiz records accept, and odd-one-out draws its three companions from the target's own continent. The UI drops the mode screen: Início lists Mundo and the five continents, the continent screen shows four level cards with both stats and both buttons, and `solutionCard` appends a status badge, which question renderers never use.

**Tech Stack:** Vite, TypeScript (strict), Vitest, plain DOM, Node 24; `happy-dom` added as a dev dependency for one DOM test file.

**Spec:** `docs/specs/2026-10-07-world-and-territories-design.md`

**Runs after:** `docs/specs/2026-10-06-other-continents-plan.md` is complete (HEAD `a9b4257` or later on `main`).

## Global Constraints

- Code, identifiers, comments and commit messages in English; every string the player sees in Brazilian Portuguese.
- Execute on `main`, without a worktree; one implementer at a time.
- Data exactly as listed in Task 1: 248 flags (193 `un`, 5 `nonMember`, 4 `ukNation`, 46 `territory`), the tier lists, names, aliases and groups. Absent codes: every `us-*`, `eu`, `un`, `aq`, `um`, `bv`, `sj`, `mf`, `hm`.
- Badge texts: `un` → "ONU", `nonMember` → "Não-membro", `ukNation` → "Nação do Reino Unido", `territory` → "Território". The badge appears only through `solutionCard` and never inside a question.
- Goal = ceil(numerator × poolSize / denominator) with easy 2/3, medium 1/1, hard 25/18, general 30/54, for every continent and for Mundo. Lives 3; recall weights and similar distractors per level unchanged.
- Medals and Quiz records keep their storage keys (`flags-quiz:medals`, `flags-quiz:quiz-records`); Mundo stores under the continent key `world`.
- No linter exists in this repo. The gates are `npm run typecheck` and `npm test` (plus `npm run build` where a step says so); run them before every commit.
- The only new dependency is the dev dependency `happy-dom` (Task 4).
- Comments only for facts from outside the file; no docstrings.
- Tests live next to the file they test, named `<file>.test.ts`.
- The operator plays on a dev server on port 5180; never stop or restart it. Browser checks use their own server on port 5174.
- Never amend or rewrite a commit.
- `SP` below means `/tmp/claude-1000/-home-abacha-projects-lab-flags-quiz/0d459095-27be-4242-8ff1-ef9b44fe69ba/scratchpad`; set `SP=` to it in every shell that uses it, since shell state does not persist between commands. It holds `xf/` (the SVGs of the non-UN flags) and `codes.json` (flagcdn's Portuguese code list).
- Commit as the agent, Conventional Commits, staging files by name:

```bash
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<type>: <subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

## Decisions taken while planning

- **Ilha Heard e Ilhas McDonald (`hm`) is excluded.** Its flagcdn SVG is the Australian flag with the same geometry; only two shades differ (`#00008b`/`red` against `#012169`/`#e4002b`). The spec's "render identical" rule covers it, so the game has 55 new flags and 248 in total; Task 5 corrects the spec's 56/249. Task 1 re-checks this visually before writing data.
- **The eleven French territories are kept.** flagcdn gives each of gp, mq, re, yt, pm, bl, gf, wf, pf, nc and tf its own design; Task 1 confirms this visually.
- **The level card says "N bandeiras".** The spec asks for the flag count; question prompts ("De qual país é esta bandeira?") stay as they are.
- **The "badge absent from options" test renders questions in `happy-dom`.** Vitest runs in `node`, so one test file opts into a DOM with `// @vitest-environment happy-dom`.
- **Odd-one-out draws its two companions from the target's continent on every level.** On a continent's level this changes nothing; in Mundo it gives the spec's three-plus-intruder shape. The intruder is still any flag from another continent.
- **Look-alike groups added beyond the required four:** Aruba with Curaçao; Ilhas Malvinas, Ilhas Geórgia do Sul e Sandwich do Sul and Anguila; Irlanda do Norte joins Inglaterra, Guernsey and Jersey; Ilhas Faroé with Ilhas Åland; Ilhas Cook, Ilhas Pitcairn and Niue.

## Review Focus

1. **A territory named after a country.** Typing "Geórgia", "Guiana", "Samoa" or "Irlanda" for a flag must grade only the country with that name. Pinned in Task 1.
2. **The badge leaking the answer.** No question format may show a badge, including the match-pairs labels and the type-similar cards. Pinned in Task 4.
3. **Odd-one-out in Mundo.** The three non-intruders must share one continent and the prompt must name it. Pinned in Task 2 (engine) and Task 5 (prompt in the browser).
4. **Medals and records saved before this change.** An Africa medal earned on the 18-flag pool must still show on its level, and saving a Mundo medal must not erase it. Pinned in Task 2 and Task 3.
5. **Mundo's large pools.** Mundo Difícil needs 113 right answers from 81 flags and Mundo Geral 138 from 248; a round must reach its goal without throwing. Pinned in Task 2.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/data/countries.json`, `src/data/similar-groups.json`, `public/flags/*.svg` | flag data, look-alike groups, 55 new SVGs | 1 |
| `src/data/countries.ts` | `Status` type, `status` and required `tier` on `Country` | 1 |
| `src/data/countries.test.ts` | data invariants | 1, 2 |
| `src/engine/pool.ts` | `ContinentKey`, Mundo pools | 2 |
| `src/engine/formats.ts` | odd-one-out companions from the target's continent | 2 |
| `src/progress.ts`, `src/quizRecords.ts` | medals and records keyed by `ContinentKey` | 2 |
| `src/ui/navigation.ts`, `src/ui/labels.ts`, `src/main.ts` | screens without mode, Mundo label | 3 |
| `src/ui/levelSummary.ts` | the three text lines of a level card | 3 |
| `src/ui/screens/home.ts`, `src/ui/screens/continent.ts` | Início and the level screen; `difficulty.ts` deleted | 3 |
| `src/ui/screens/game.ts`, `result.ts`, `quiz.ts`, `quizResult.ts` | `ContinentKey` and "Voltar" to the continent screen | 3 |
| `src/ui/badge.ts`, `src/ui/questions/feedback.ts` | the status badge in solution cards | 4 |
| `src/style.css` | level card and badge styles | 3, 4 |
| `README.md`, the spec | docs | 5 |

---

### Task 1: Flags outside the UN, statuses, tiers and look-alike groups

**Files:**
- Modify: `src/data/countries.ts`, `src/data/countries.json`, `src/data/similar-groups.json`, `src/data/countries.test.ts`
- Create: 55 files `public/flags/<iso2>.svg`
- Modify (size-coupled tests): `src/engine/pool.test.ts`, `src/engine/round.test.ts`, `src/engine/quiz.test.ts`, `src/engine/formats.test.ts`
- Throwaway (scratchpad, not committed): `$SP/lookalike.html`, `$SP/lookalike.png`, `$SP/world-data.mjs`

**Interfaces:**
- Produces:

```ts
// src/data/countries.ts
export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania';
export type Tier = 1 | 2 | 3;
export type Status = 'un' | 'nonMember' | 'ukNation' | 'territory';
export interface Country { iso2: string; name: string; continent: Continent; status: Status; tier: Tier; aliases: string[] }
```

`countries.json` key order per entry: `iso2, name, continent, status, tier, aliases`, sorted by `iso2`.

**The data.** Tiers per continent, ordered by how recognizable the flag and the place are (✱ marks a new flag):

| Continent | Fácil | Médio | Difícil |
|---|---|---|---|
| África (60) | 20: ao cm dz eg et gh ke ma mg mz ng sn so tn tz ug za zw ci cd | 20: bf bw cv er gn ls ly ml mw na rw sc sd ss sz zm cg ne sl lr | 20: bi bj cf dj ga gm gq gw km mr mu st td tg eh✱ io✱ re✱ sh✱ yt✱ tf✱ |
| Américas (55) | 19: ar br ca cl co cu jm mx pe us uy ve pr✱ gl✱ py ec pa cr do | 18: bo gt hn ht ni sv tt bs bb bz gy sr gd bm✱ fk✱ aw✱ cw✱ gf✱ | 18: ag dm kn lc vc ai✱ bl✱ bq✱ gp✱ gs✱ ky✱ mq✱ ms✱ pm✱ sx✱ tc✱ vg✱ vi✱ |
| Ásia (50) | 17: cn id il in ir jp kp kr mn np ph pk sa th tr vn tw✱ | 17: ae af bd iq jo kh kz la lb lk mm my qa sg sy hk✱ ps✱ | 16: am az bh bn bt ge kg kw mv om tj tl tm uz ye mo✱ |
| Europa (56) | 19: be ch de dk es fr gb gr ie it nl no pl pt se ru gb-eng✱ gb-sct✱ gb-wls✱ | 19: al at bg cy cz fi hr hu is lu mt ro rs ua ba mc va✱ xk✱ gb-nir✱ | 18: ad by ee li lt lv md me mk si sk sm ax✱ fo✱ gg✱ gi✱ im✱ je✱ |
| Oceania (27) | 9: au fj nz pg sb ws to vu pf✱ | 9: fm ki mh nr pw tv nc✱ gu✱ as✱ | 9: ck✱ cc✱ cx✱ mp✱ nf✱ nu✱ pn✱ tk✱ wf✱ |

UN members that change tier: África cd, ci (2→1), cg, ne, sl, lr (3→2); Américas py, ec, pa, cr, do (2→1), bs, bb, bz, gy, sr, gd (3→2); Europa ru (2→1), ba, mc (3→2); Oceania ws, to, vu (2→1), mh, nr, pw, tv (3→2).

The 55 new flags (continent from mledoze `region`, except the four UK nations, which mledoze lacks, and gs and tf, which mledoze files under Antarctic):

| iso2 | Name | Continent | Status | Aliases |
|---|---|---|---|---|
| ai | Anguila | americas | territory | Anguilla |
| as | Samoa Americana | oceania | territory | |
| aw | Aruba | americas | territory | |
| ax | Ilhas Åland | europe | territory | Åland |
| bl | São Bartolomeu | americas | territory | Saint-Barthélemy |
| bm | Bermudas | americas | territory | Bermuda |
| bq | Países Baixos Caribenhos | americas | territory | Caribe Neerlandês, Bonaire |
| cc | Ilhas Cocos | oceania | territory | Ilhas Cocos (Keeling), Ilhas Keeling |
| ck | Ilhas Cook | oceania | territory | |
| cw | Curaçao | americas | territory | Curaçau |
| cx | Ilha Christmas | oceania | territory | Ilha do Natal |
| eh | Saara Ocidental | africa | nonMember | |
| fk | Ilhas Malvinas | americas | territory | Malvinas, Falklands |
| fo | Ilhas Faroé | europe | territory | Faroé, Feroe, Ilhas Feroe |
| gb-eng | Inglaterra | europe | ukNation | |
| gb-nir | Irlanda do Norte | europe | ukNation | |
| gb-sct | Escócia | europe | ukNation | |
| gb-wls | País de Gales | europe | ukNation | Gales |
| gf | Guiana Francesa | americas | territory | |
| gg | Guernsey | europe | territory | |
| gi | Gibraltar | europe | territory | |
| gl | Groenlândia | americas | territory | |
| gp | Guadalupe | americas | territory | |
| gs | Ilhas Geórgia do Sul e Sandwich do Sul | americas | territory | Geórgia do Sul |
| gu | Guam | oceania | territory | |
| hk | Hong Kong | asia | territory | |
| im | Ilha de Man | europe | territory | |
| io | Território Britânico do Oceano Índico | africa | territory | |
| je | Jersey | europe | territory | |
| ky | Ilhas Cayman | americas | territory | Ilhas Caimã, Cayman |
| mo | Macau | asia | territory | |
| mp | Ilhas Marianas do Norte | oceania | territory | Ilhas Marianas Setentrionais |
| mq | Martinica | americas | territory | |
| ms | Montserrat | americas | territory | Monserrate |
| nc | Nova Caledônia | oceania | territory | |
| nf | Ilha Norfolk | oceania | territory | |
| nu | Niue | oceania | territory | |
| pf | Polinésia Francesa | oceania | territory | |
| pm | São Pedro e Miquelon | americas | territory | São Pedro e Miquelão |
| pn | Ilhas Pitcairn | oceania | territory | |
| pr | Porto Rico | americas | territory | |
| ps | Palestina | asia | nonMember | Estado da Palestina |
| re | Reunião | africa | territory | |
| sh | Santa Helena, Ascensão e Tristão da Cunha | africa | territory | Santa Helena |
| sx | São Martinho | americas | territory | Sint Maarten, São Martinho (Países Baixos) |
| tc | Ilhas Turcas e Caicos | americas | territory | |
| tf | Terras Austrais e Antárticas Francesas | africa | territory | Terras Austrais Francesas |
| tk | Tokelau | oceania | territory | Toquelau |
| tw | Taiwan | asia | nonMember | |
| va | Vaticano | europe | nonMember | Santa Sé, Cidade do Vaticano |
| vg | Ilhas Virgens Britânicas | americas | territory | |
| vi | Ilhas Virgens Americanas | americas | territory | Ilhas Virgens dos Estados Unidos |
| wf | Wallis e Futuna | oceania | territory | |
| xk | Kosovo | europe | nonMember | |
| yt | Mayotte | africa | territory | |

Look-alike groups: `ps` joins `["jo","ae","kw"]`, and seven groups are appended: `["pr","cu"]`, `["aw","cw"]`, `["ky","vg","ms","tc"]`, `["fk","gs","ai"]`, `["gb-eng","gb-nir","gg","je"]`, `["fo","ax"]`, `["ck","pn","nu"]`. Every level of every continent keeps a group with at least two members in its pool.

- [ ] **Step 1: Check the look-alike exclusions by eye**

Build a side-by-side page and screenshot it with headless Chrome:

```bash
SP=/tmp/claude-1000/-home-abacha-projects-lab-flags-quiz/0d459095-27be-4242-8ff1-ef9b44fe69ba/scratchpad
FLAGS=/home/abacha/projects/lab/flags_quiz/public/flags
{
  echo '<!doctype html><meta charset="utf-8"><style>body{margin:0;font:14px sans-serif}div{display:flex;gap:12px;align-items:center;margin:8px}img{height:80px;box-shadow:0 0 0 1px #888}</style>'
  echo "<div><img src=\"file://$FLAGS/au.svg\"><img src=\"file://$SP/xf/hm.svg\"> au | hm</div>"
  for code in gp mq re yt pm bl gf wf pf nc tf; do
    echo "<div><img src=\"file://$FLAGS/fr.svg\"><img src=\"file://$SP/xf/$code.svg\"> fr | $code</div>"
  done
} > "$SP/lookalike.html"
google-chrome --headless=new --disable-gpu --hide-scrollbars --window-size=600,1300 --screenshot="$SP/lookalike.png" "file://$SP/lookalike.html"
```

Open `$SP/lookalike.png` with the Read tool. A pair counts as identical when the design is the same and at most a shade differs.
Expected: `hm` shows the Australian flag (identical, excluded); each of the eleven French territories shows a design of its own (kept).
If any pair comes out otherwise, stop and report BLOCKED with the screenshot: the tier lists above depend on these outcomes.

- [ ] **Step 2: Update `src/data/countries.ts`**

```ts
import countriesJson from './countries.json';
import similarGroupsJson from './similar-groups.json';

export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania';
export type Tier = 1 | 2 | 3;
export type Status = 'un' | 'nonMember' | 'ukNation' | 'territory';

export interface Country {
  iso2: string;
  name: string;
  continent: Continent;
  status: Status;
  tier: Tier;
  aliases: string[];
}

export const countries = countriesJson as Country[];
export const similarGroups: string[][] = similarGroupsJson;
```

- [ ] **Step 3: Rewrite `src/data/countries.test.ts`**

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { acceptsTypedName, normalizeName } from '../engine/answer';
import { poolFor, type Difficulty } from '../engine/pool';
import { countries, similarGroups, type Continent, type Status } from './countries';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'general'];
const CONTINENTS: Continent[] = ['africa', 'americas', 'asia', 'europe', 'oceania'];

const byIso = new Map(countries.map((c) => [c.iso2, c]));
const codesWith = (status: Status) =>
  countries
    .filter((c) => c.status === status)
    .map((c) => c.iso2)
    .sort();

describe('countries', () => {
  it('has 248 flags: 193 UN members, 5 other states, 4 UK nations and 46 territories', () => {
    expect(countries).toHaveLength(248);
    expect(codesWith('un')).toHaveLength(193);
    expect(codesWith('nonMember')).toEqual(['eh', 'ps', 'tw', 'va', 'xk']);
    expect(codesWith('ukNation')).toEqual(['gb-eng', 'gb-nir', 'gb-sct', 'gb-wls']);
    expect(codesWith('territory')).toHaveLength(46);
  });

  it('leaves out the US states, the flags without a continent and the flags identical to another one', () => {
    expect(countries.filter((c) => c.iso2.startsWith('us-'))).toEqual([]);
    for (const code of ['eu', 'un', 'aq', 'um', 'bv', 'sj', 'mf', 'hm']) expect(byIso.has(code)).toBe(false);
  });

  it.each([
    ['africa', 60],
    ['americas', 55],
    ['asia', 50],
    ['europe', 56],
    ['oceania', 27],
  ] as const)('puts the right number of flags in %s', (continent, size) => {
    expect(countries.filter((c) => c.continent === continent)).toHaveLength(size);
  });

  it.each(CONTINENTS)('splits %s into three tiers whose sizes differ by at most one', (continent) => {
    const members = countries.filter((c) => c.continent === continent);
    expect(members.every((c) => [1, 2, 3].includes(c.tier))).toBe(true);
    const sizes = [1, 2, 3].map((tier) => members.filter((c) => c.tier === tier).length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('accepts no typed name for two different countries, except "Congo"', () => {
    const owners = new Map<string, string>();
    for (const country of countries) {
      for (const name of [country.name, ...country.aliases].map(normalizeName).filter((n) => n !== 'congo')) {
        expect(owners.get(name) ?? country.iso2).toBe(country.iso2);
        owners.set(name, country.iso2);
      }
    }
  });

  it.each([
    ['gs', 'ge', 'Geórgia'],
    ['gf', 'gy', 'Guiana'],
    ['as', 'ws', 'Samoa'],
    ['gb-nir', 'ie', 'Irlanda'],
  ])('grades "%s" apart from the country it is named after', (territory, country, typed) => {
    expect(acceptsTypedName(byIso.get(territory)!, typed)).toBe(false);
    expect(acceptsTypedName(byIso.get(country)!, typed)).toBe(true);
  });

  it('has unique codes and unique names', () => {
    expect(new Set(countries.map((c) => c.iso2)).size).toBe(countries.length);
    expect(new Set(countries.map((c) => c.name)).size).toBe(countries.length);
  });

  it('has a flag file for every country', () => {
    const missing = countries.filter((c) => !existsSync(new URL(`../../public/flags/${c.iso2}.svg`, import.meta.url)));
    expect(missing.map((c) => c.iso2)).toEqual([]);
  });

  it('carries the hand-corrected names', () => {
    expect(
      ['cd', 'mm', 'gl', 'nc', 'fo', 'cw', 'tk', 'ms', 'pm', 'ps', 'cc'].map((code) => byIso.get(code)?.name),
    ).toEqual([
      'República Democrática do Congo',
      'Mianmar',
      'Groenlândia',
      'Nova Caledônia',
      'Ilhas Faroé',
      'Curaçao',
      'Tokelau',
      'Montserrat',
      'São Pedro e Miquelon',
      'Palestina',
      'Ilhas Cocos',
    ]);
  });

  it('accepts the spellings the spec names', () => {
    for (const typed of ['Malvinas', 'Falklands']) expect(acceptsTypedName(byIso.get('fk')!, typed)).toBe(true);
    for (const typed of ['Faroé', 'Feroe']) expect(acceptsTypedName(byIso.get('fo')!, typed)).toBe(true);
  });
});

describe('similarGroups', () => {
  it('groups 2 to 4 existing countries of one continent', () => {
    for (const group of similarGroups) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      expect(group.length).toBeLessThanOrEqual(4);
      const continents = new Set(group.map((iso2) => byIso.get(iso2)?.continent));
      expect(continents.size).toBe(1);
      expect(continents.has(undefined)).toBe(false);
    }
  });

  it('covers every continent', () => {
    const covered = new Set(similarGroups.map((group) => byIso.get(group[0])?.continent));
    expect(covered).toEqual(new Set(CONTINENTS));
  });

  it('holds the groups the spec requires', () => {
    const grouped = (codes: string[]) => similarGroups.some((group) => codes.every((code) => group.includes(code)));
    expect(grouped(['pr', 'cu'])).toBe(true);
    expect(grouped(['ps', 'jo', 'ae', 'kw'])).toBe(true);
    expect(grouped(['ky', 'vg', 'ms', 'tc'])).toBe(true);
    expect(grouped(['gb-eng', 'gg', 'je'])).toBe(true);
  });

  it.each(CONTINENTS)('gives every %s level a look-alike group with at least two members inside the pool', (continent) => {
    for (const difficulty of DIFFICULTIES) {
      const pool = new Set(poolFor(countries, continent, difficulty).map((c) => c.iso2));
      expect(similarGroups.some((group) => group.filter((iso2) => pool.has(iso2)).length >= 2)).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Update the size-coupled engine tests**

Africa's tiers grow from 18 to 20 and Oceania's from 5/5/4 to 9/9/9, so these tests change with the data.

`src/engine/pool.test.ts` — replace the whole file:

```ts
import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { goalFor, poolFor } from './pool';

const LEVELS = ['easy', 'medium', 'hard', 'general'] as const;

describe('poolFor', () => {
  it.each([
    ['easy', 1],
    ['medium', 2],
    ['hard', 3],
  ] as const)('gives only tier %s countries on %s', (difficulty, tier) => {
    const pool = poolFor(countries, 'africa', difficulty);
    expect(pool).toHaveLength(20);
    expect(pool.every((c) => c.tier === tier)).toBe(true);
  });

  it.each([
    ['africa', [20, 20, 20, 60]],
    ['americas', [19, 18, 18, 55]],
    ['asia', [17, 17, 16, 50]],
    ['europe', [19, 19, 18, 56]],
    ['oceania', [9, 9, 9, 27]],
  ] as const)('sizes the %s pools', (continent, sizes) => {
    expect(LEVELS.map((d) => poolFor(countries, continent, d).length)).toEqual(sizes);
  });
});

describe('goalFor', () => {
  it.each([
    ['africa', [14, 20, 28, 34]],
    ['americas', [13, 18, 25, 31]],
    ['asia', [12, 17, 23, 28]],
    ['europe', [13, 19, 25, 32]],
    ['oceania', [6, 9, 13, 15]],
  ] as const)('scales the %s goals with the pool', (continent, goals) => {
    expect(LEVELS.map((d) => goalFor(d, poolFor(countries, continent, d).length))).toEqual(goals);
  });
});
```

`src/engine/quiz.test.ts` — in `asks every country of the pool once`, replace `toEqual([18, 18, 0, 0])` with `toEqual([20, 20, 0, 0])`.

`src/engine/round.test.ts`:
- in `asks every country once before any repeats`, replace both `18` with `easy.pool.length` (`Array.from({ length: easy.pool.length }, …)` and `toBe(easy.pool.length)`);
- in `starts the next pass with the countries missed in the round`, replace `i < 17` with `i < easy.pool.length - 1`;
- rename `plays a 25-answer round on an 18-country pool with every format` to `plays a 25-answer round on the Africa Difícil pool with every format`.

`src/engine/formats.test.ts`, in `describe('small pools')`, replace the `tiny` and `fiveCountries` lines with:

```ts
  const tiny: FormatContext = { ...contextFor('hard'), pool: poolFor(countries, 'oceania', 'general').slice(0, 4) };
  const fiveCountries: FormatContext = { ...contextFor('hard'), pool: poolFor(countries, 'oceania', 'general').slice(0, 5) };
```

- [ ] **Step 5: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL — 193 flags instead of 248, no `status`, the old tier sizes, no flag files for the new codes.

- [ ] **Step 6: Edit the data with a throwaway script**

Save as `$SP/world-data.mjs` and run from the repo root with `node $SP/world-data.mjs`:

```js
import { copyFile, readFile, writeFile } from 'node:fs/promises';

const XF = '/tmp/claude-1000/-home-abacha-projects-lab-flags-quiz/0d459095-27be-4242-8ff1-ef9b44fe69ba/scratchpad/xf';

const TIERS = {
  africa: [
    'ao cm dz eg et gh ke ma mg mz ng sn so tn tz ug za zw ci cd',
    'bf bw cv er gn ls ly ml mw na rw sc sd ss sz zm cg ne sl lr',
    'bi bj cf dj ga gm gq gw km mr mu st td tg eh io re sh yt tf',
  ],
  americas: [
    'ar br ca cl co cu jm mx pe us uy ve pr gl py ec pa cr do',
    'bo gt hn ht ni sv tt bs bb bz gy sr gd bm fk aw cw gf',
    'ag dm kn lc vc ai bl bq gp gs ky mq ms pm sx tc vg vi',
  ],
  asia: [
    'cn id il in ir jp kp kr mn np ph pk sa th tr vn tw',
    'ae af bd iq jo kh kz la lb lk mm my qa sg sy hk ps',
    'am az bh bn bt ge kg kw mv om tj tl tm uz ye mo',
  ],
  europe: [
    'be ch de dk es fr gb gr ie it nl no pl pt se ru gb-eng gb-sct gb-wls',
    'al at bg cy cz fi hr hu is lu mt ro rs ua ba mc va xk gb-nir',
    'ad by ee li lt lv md me mk si sk sm ax fo gg gi im je',
  ],
  oceania: [
    'au fj nz pg sb ws to vu pf',
    'fm ki mh nr pw tv nc gu as',
    'ck cc cx mp nf nu pn tk wf',
  ],
};

const NEW = {
  ai: ['Anguila', 'americas', 'territory', ['Anguilla']],
  as: ['Samoa Americana', 'oceania', 'territory', []],
  aw: ['Aruba', 'americas', 'territory', []],
  ax: ['Ilhas Åland', 'europe', 'territory', ['Åland']],
  bl: ['São Bartolomeu', 'americas', 'territory', ['Saint-Barthélemy']],
  bm: ['Bermudas', 'americas', 'territory', ['Bermuda']],
  bq: ['Países Baixos Caribenhos', 'americas', 'territory', ['Caribe Neerlandês', 'Bonaire']],
  cc: ['Ilhas Cocos', 'oceania', 'territory', ['Ilhas Cocos (Keeling)', 'Ilhas Keeling']],
  ck: ['Ilhas Cook', 'oceania', 'territory', []],
  cw: ['Curaçao', 'americas', 'territory', ['Curaçau']],
  cx: ['Ilha Christmas', 'oceania', 'territory', ['Ilha do Natal']],
  eh: ['Saara Ocidental', 'africa', 'nonMember', []],
  fk: ['Ilhas Malvinas', 'americas', 'territory', ['Malvinas', 'Falklands']],
  fo: ['Ilhas Faroé', 'europe', 'territory', ['Faroé', 'Feroe', 'Ilhas Feroe']],
  'gb-eng': ['Inglaterra', 'europe', 'ukNation', []],
  'gb-nir': ['Irlanda do Norte', 'europe', 'ukNation', []],
  'gb-sct': ['Escócia', 'europe', 'ukNation', []],
  'gb-wls': ['País de Gales', 'europe', 'ukNation', ['Gales']],
  gf: ['Guiana Francesa', 'americas', 'territory', []],
  gg: ['Guernsey', 'europe', 'territory', []],
  gi: ['Gibraltar', 'europe', 'territory', []],
  gl: ['Groenlândia', 'americas', 'territory', []],
  gp: ['Guadalupe', 'americas', 'territory', []],
  gs: ['Ilhas Geórgia do Sul e Sandwich do Sul', 'americas', 'territory', ['Geórgia do Sul']],
  gu: ['Guam', 'oceania', 'territory', []],
  hk: ['Hong Kong', 'asia', 'territory', []],
  im: ['Ilha de Man', 'europe', 'territory', []],
  io: ['Território Britânico do Oceano Índico', 'africa', 'territory', []],
  je: ['Jersey', 'europe', 'territory', []],
  ky: ['Ilhas Cayman', 'americas', 'territory', ['Ilhas Caimã', 'Cayman']],
  mo: ['Macau', 'asia', 'territory', []],
  mp: ['Ilhas Marianas do Norte', 'oceania', 'territory', ['Ilhas Marianas Setentrionais']],
  mq: ['Martinica', 'americas', 'territory', []],
  ms: ['Montserrat', 'americas', 'territory', ['Monserrate']],
  nc: ['Nova Caledônia', 'oceania', 'territory', []],
  nf: ['Ilha Norfolk', 'oceania', 'territory', []],
  nu: ['Niue', 'oceania', 'territory', []],
  pf: ['Polinésia Francesa', 'oceania', 'territory', []],
  pm: ['São Pedro e Miquelon', 'americas', 'territory', ['São Pedro e Miquelão']],
  pn: ['Ilhas Pitcairn', 'oceania', 'territory', []],
  pr: ['Porto Rico', 'americas', 'territory', []],
  ps: ['Palestina', 'asia', 'nonMember', ['Estado da Palestina']],
  re: ['Reunião', 'africa', 'territory', []],
  sh: ['Santa Helena, Ascensão e Tristão da Cunha', 'africa', 'territory', ['Santa Helena']],
  sx: ['São Martinho', 'americas', 'territory', ['Sint Maarten', 'São Martinho (Países Baixos)']],
  tc: ['Ilhas Turcas e Caicos', 'americas', 'territory', []],
  tf: ['Terras Austrais e Antárticas Francesas', 'africa', 'territory', ['Terras Austrais Francesas']],
  tk: ['Tokelau', 'oceania', 'territory', ['Toquelau']],
  tw: ['Taiwan', 'asia', 'nonMember', []],
  va: ['Vaticano', 'europe', 'nonMember', ['Santa Sé', 'Cidade do Vaticano']],
  vg: ['Ilhas Virgens Britânicas', 'americas', 'territory', []],
  vi: ['Ilhas Virgens Americanas', 'americas', 'territory', ['Ilhas Virgens dos Estados Unidos']],
  wf: ['Wallis e Futuna', 'oceania', 'territory', []],
  xk: ['Kosovo', 'europe', 'nonMember', []],
  yt: ['Mayotte', 'africa', 'territory', []],
};

const ANTARCTIC = ['gs', 'tf'];
const NOT_IN_MLEDOZE = ['gb-eng', 'gb-nir', 'gb-sct', 'gb-wls'];

const GROUPS = [
  ['pr', 'cu'],
  ['aw', 'cw'],
  ['ky', 'vg', 'ms', 'tc'],
  ['fk', 'gs', 'ai'],
  ['gb-eng', 'gb-nir', 'gg', 'je'],
  ['fo', 'ax'],
  ['ck', 'pn', 'nu'],
];

async function fetchWithTimeout(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

const source = await (await fetchWithTimeout('https://raw.githubusercontent.com/mledoze/countries/master/countries.json')).json();
const regionOf = new Map(source.map((c) => [c.cca2.toLowerCase(), c.region.toLowerCase()]));
for (const [iso2, [, continent]] of Object.entries(NEW)) {
  if (NOT_IN_MLEDOZE.includes(iso2)) {
    if (regionOf.has(iso2)) throw new Error(`${iso2} is in mledoze after all`);
    continue;
  }
  const expected = ANTARCTIC.includes(iso2) ? 'antarctic' : continent;
  if (regionOf.get(iso2) !== expected) throw new Error(`${iso2}: mledoze says ${regionOf.get(iso2)}, plan says ${expected}`);
}

const tierOf = new Map();
for (const [continent, tiers] of Object.entries(TIERS)) {
  tiers.forEach((codes, index) => {
    for (const iso2 of codes.split(' ')) {
      if (tierOf.has(iso2)) throw new Error(`${iso2} tiered twice`);
      tierOf.set(iso2, { continent, tier: index + 1 });
    }
  });
}

const old = JSON.parse(await readFile('src/data/countries.json', 'utf8'));
if (old.length !== 193) throw new Error(`expected 193 countries, found ${old.length}`);
const entries = [
  ...old.map((c) => ({ ...c, status: 'un' })),
  ...Object.entries(NEW).map(([iso2, [name, continent, status, aliases]]) => ({ iso2, name, continent, status, aliases })),
];
const countries = entries
  .map((c) => {
    const placed = tierOf.get(c.iso2);
    if (!placed) throw new Error(`no tier for ${c.iso2}`);
    if (placed.continent !== c.continent) throw new Error(`${c.iso2} is ${c.continent} but tiered under ${placed.continent}`);
    return { iso2: c.iso2, name: c.name, continent: c.continent, status: c.status, tier: placed.tier, aliases: c.aliases };
  })
  .sort((a, b) => a.iso2.localeCompare(b.iso2));
if (countries.length !== tierOf.size) throw new Error(`tier lists hold ${tierOf.size} codes for ${countries.length} flags`);
await writeFile('src/data/countries.json', JSON.stringify(countries, null, 2) + '\n');

const groups = JSON.parse(await readFile('src/data/similar-groups.json', 'utf8'));
const palestine = groups.find((group) => group.join() === 'jo,ae,kw');
if (!palestine) throw new Error('group jo,ae,kw not found');
palestine.push('ps');
await writeFile('src/data/similar-groups.json', JSON.stringify([...groups, ...GROUPS], null, 2) + '\n');

for (const iso2 of Object.keys(NEW)) await copyFile(`${XF}/${iso2}.svg`, `public/flags/${iso2}.svg`);
console.log(`wrote ${countries.length} flags, ${groups.length + GROUPS.length} groups, ${Object.keys(NEW).length} SVGs`);
```

Expected output: `wrote 248 flags, 45 groups, 55 SVGs`.
Then `git status --short` shows the two JSON files modified and 55 new SVGs under `public/flags/`, and nothing else in `src/data` or `public/`.

- [ ] **Step 7: Run the gates**

Run: `npm run typecheck && npm test`
Expected: clean; every test passes.
If the alias-collision test fails, read the colliding pair, drop the offending alias from the JSON, and say which in the report.
If any seed-dependent engine test fails, stop and report its output; do not change seeds or thresholds.

- [ ] **Step 8: Delete the scripts and commit**

```bash
rm $SP/world-data.mjs $SP/lookalike.html
git add src/data/countries.ts src/data/countries.json src/data/similar-groups.json src/data/countries.test.ts src/engine/pool.test.ts src/engine/round.test.ts src/engine/quiz.test.ts src/engine/formats.test.ts public/flags/*.svg
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: add the flags outside the UN and re-tier every continent" -m $'Names come from flagcdn\'s Portuguese list corrected to pt-BR; continents from mledoze, with the UK nations in Europe and the Antarctic territories on the nearest continent. hm is left out as identical to au.\n\nNexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Mundo in the engine, odd-one-out across continents, and storage under `world`

**Files:**
- Modify: `src/engine/pool.ts`, `src/engine/pool.test.ts`, `src/engine/formats.ts`, `src/engine/formats.test.ts`, `src/engine/round.test.ts`, `src/data/countries.test.ts`, `src/progress.ts`, `src/progress.test.ts`, `src/quizRecords.ts`, `src/quizRecords.test.ts`

**Interfaces:**
- Consumes: `Country.tier` is required (Task 1).
- Produces:

```ts
// src/engine/pool.ts
export type ContinentKey = Continent | 'world';
export function poolFor(all: readonly Country[], continent: ContinentKey, difficulty: Difficulty): Country[];
// src/progress.ts
export type Medals = Partial<Record<ContinentKey, Partial<Record<Difficulty, true>>>>;
export function awardMedal(store: MedalStore, continent: ContinentKey, difficulty: Difficulty): void;
export function hasMedal(medals: Medals, continent: ContinentKey, difficulty: Difficulty): boolean;
// src/quizRecords.ts
export type QuizRecords = Partial<Record<ContinentKey, Partial<Record<Difficulty, QuizRecord>>>>;
export function quizRecord(records: QuizRecords, continent: ContinentKey, difficulty: Difficulty): QuizRecord;
export function saveQuizOutcome(store: RecordStore, continent: ContinentKey, difficulty: Difficulty, outcome: QuizOutcome): NewRecords;
```

`oddOneOut.canTarget(target, ctx)` is true when the pool holds at least two other flags of the target's continent.

- [ ] **Step 1: Write the failing tests**

Append to `src/engine/pool.test.ts`:

```ts
describe('Mundo', () => {
  const CONTINENTS = ['africa', 'americas', 'asia', 'europe', 'oceania'] as const;

  it.each(LEVELS)('builds the %s pool as the union of the continents', (difficulty) => {
    const union = CONTINENTS.flatMap((continent) => poolFor(countries, continent, difficulty)).map((c) => c.iso2);
    expect(poolFor(countries, 'world', difficulty).map((c) => c.iso2).sort()).toEqual(union.sort());
  });

  it('sizes the pools and scales the goals', () => {
    const sizes = LEVELS.map((d) => poolFor(countries, 'world', d).length);
    expect(sizes).toEqual([84, 83, 81, 248]);
    expect(LEVELS.map((d, i) => goalFor(d, sizes[i]))).toEqual([56, 83, 113, 138]);
  });
});
```

Append to `src/engine/formats.test.ts`, inside `describe('oddOneOut')`:

```ts
  it('in Mundo, mixes three flags of one continent with an intruder from another', () => {
    const world: FormatContext = { ...general, pool: poolFor(countries, 'world', 'general') };
    for (const question of buildMany(oddOneOut, world)) {
      if (question.format !== 'oddOneOut') throw new Error('expected oddOneOut');
      const three = question.options.filter((c) => c !== question.intruder);
      expect(three).toHaveLength(3);
      expect(new Set(three.map((c) => c.continent))).toEqual(new Set([question.target.continent]));
      expect(question.intruder.continent).not.toBe(question.target.continent);
      expect(three.every((c) => world.pool.includes(c))).toBe(true);
    }
  });

  it('targets only flags with two continent mates in the pool', () => {
    const mixed: FormatContext = { ...easy, pool: ['ao', 'br', 'ar', 'cl'].map(byIso) };
    expect(oddOneOut.canTarget(byIso('ao'), mixed)).toBe(false);
    expect(oddOneOut.canTarget(byIso('br'), mixed)).toBe(true);
  });
```

In `src/engine/round.test.ts`, change the last test's list to `(['africa', 'americas', 'asia', 'europe', 'oceania', 'world'] as const)`.

In `src/data/countries.test.ts`, change the look-alike coverage test's `it.each(CONTINENTS)` to `it.each([...CONTINENTS, 'world'] as const)`.

Append to `src/progress.test.ts`, inside `describe('medals')`:

```ts
  it('keeps a Mundo medal beside the medals saved before Mundo existed', () => {
    const store = memoryStore();
    store.data.set('flags-quiz:medals', '{"africa":{"easy":true}}');
    awardMedal(store, 'world', 'general');
    expect(loadMedals(store)).toEqual({ africa: { easy: true }, world: { general: true } });
    expect(hasMedal(loadMedals(store), 'africa', 'easy')).toBe(true);
  });
```

Append to `src/quizRecords.test.ts`, inside `describe('quiz records')`:

```ts
  it('keeps Mundo records under world, apart from the continents', () => {
    const store = memoryStore();
    saveQuizOutcome(store, 'africa', 'easy', outcome(18, 95000));
    saveQuizOutcome(store, 'world', 'easy', outcome(70, 400000));
    expect(quizRecord(loadQuizRecords(store), 'world', 'easy')).toEqual({ bestScore: 70, bestTimeMs: 400000 });
    expect(quizRecord(loadQuizRecords(store), 'africa', 'easy')).toEqual({ bestScore: 18, bestTimeMs: 95000 });
  });
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run typecheck; npm test`
Expected: typecheck errors on `'world'` (not a `Continent`); the odd-one-out tests fail (companions from other continents; `canTarget` always true).

- [ ] **Step 3: Add `ContinentKey` and the Mundo pool to `src/engine/pool.ts`**

Replace the import line and `poolFor`:

```ts
import type { Continent, Country, Tier } from '../data/countries';

export type ContinentKey = Continent | 'world';
```

```ts
export function poolFor(all: readonly Country[], continent: ContinentKey, difficulty: Difficulty): Country[] {
  const { tiers } = LEVEL_RULES[difficulty];
  return all.filter((c) => (continent === 'world' || c.continent === continent) && tiers.includes(c.tier));
}
```

- [ ] **Step 4: Draw odd-one-out companions from the target's continent in `src/engine/formats.ts`**

Add after `othersInPool`:

```ts
function continentMatesInPool(target: Country, ctx: FormatContext): Country[] {
  return othersInPool(target, ctx).filter((c) => c.continent === target.continent);
}
```

Replace `oddOneOut` with:

```ts
export const oddOneOut: Format = {
  id: 'oddOneOut',
  recall: false,
  canTarget: (target, ctx) => continentMatesInPool(target, ctx).length >= 2,
  build: (target, ctx, rng) => {
    const intruder = pickOne(ctx.world.filter((c) => c.continent !== target.continent), rng);
    const others = sample(continentMatesInPool(target, ctx), 2, rng);
    return { format: 'oddOneOut', target, intruder, options: shuffle([target, ...others, intruder], rng) };
  },
};
```

- [ ] **Step 5: Key medals and records by `ContinentKey`**

`src/progress.ts`: replace `import type { Continent } from './data/countries';` and `import type { Difficulty } from './engine/pool';` with `import type { ContinentKey, Difficulty } from './engine/pool';`, and replace every `Continent` type in the file with `ContinentKey` (the `Medals` type, `awardMedal`, `hasMedal`).

`src/quizRecords.ts`: the same two-import change, and every `Continent` type becomes `ContinentKey` (`QuizRecords`, `quizRecord`, `saveQuizOutcome`).

- [ ] **Step 6: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean; the Mundo round test reaches 113 on Difícil and 138 on Geral.

- [ ] **Step 7: Commit**

```bash
git add src/engine/pool.ts src/engine/pool.test.ts src/engine/formats.ts src/engine/formats.test.ts src/engine/round.test.ts src/data/countries.test.ts src/progress.ts src/progress.test.ts src/quizRecords.ts src/quizRecords.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: play every continent at once under the world key" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: Continent-first navigation with Aprender and Quiz on each level

**Files:**
- Create: `src/ui/levelSummary.ts`, `src/ui/levelSummary.test.ts`
- Modify: `src/ui/navigation.ts`, `src/ui/labels.ts`, `src/main.ts`, `src/ui/screens/home.ts`, `src/ui/screens/continent.ts`, `src/ui/screens/game.ts`, `src/ui/screens/result.ts`, `src/ui/screens/quiz.ts`, `src/ui/screens/quizResult.ts`, `src/style.css`
- Delete: `src/ui/screens/difficulty.ts`

**Interfaces:**
- Consumes: `ContinentKey`, `poolFor`, `goalFor` (Task 2); `Medals`, `hasMedal`, `loadMedals`; `QuizRecords`, `quizRecord`, `loadQuizRecords`.
- Produces:

```ts
// src/ui/navigation.ts — Mode is removed; the 'difficulty' screen is removed
export type Screen =
  | { name: 'home' }
  | { name: 'continent'; continent: ContinentKey }
  | { name: 'game'; continent: ContinentKey; difficulty: Difficulty }
  | { name: 'result'; continent: ContinentKey; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] }
  | { name: 'quiz'; continent: ContinentKey; difficulty: Difficulty }
  | { name: 'quizResult'; continent: ContinentKey; difficulty: Difficulty; score: number; timeMs: number; finished: boolean; unanswered: number; missed: Country[]; newRecords: NewRecords };
// src/ui/labels.ts — CONTINENTS is replaced
export const CONTINENT_KEYS: readonly ContinentKey[];
export const CONTINENT_LABEL: Record<ContinentKey, string>;
// src/ui/levelSummary.ts
export interface LevelSummary { flags: string; learn: string; quiz: string }
export function levelSummary(continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): LevelSummary;
// src/ui/screens/continent.ts
export function renderContinent(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void;
```

- [ ] **Step 1: Write the failing test `src/ui/levelSummary.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { levelSummary } from './levelSummary';

describe('levelSummary', () => {
  it('shows the flag count, the goal and no record on a fresh level', () => {
    expect(levelSummary('africa', 'easy', {}, {})).toEqual({
      flags: '20 bandeiras',
      learn: 'Aprender: 14 acertos',
      quiz: 'Quiz: sem recorde',
    });
  });

  it('keeps a medal earned before the levels were redistributed', () => {
    expect(levelSummary('africa', 'hard', { africa: { hard: true } }, {}).learn).toBe('Aprender: 28 acertos · 🏅');
  });

  it('shows the Mundo medal and records saved under world', () => {
    expect(
      levelSummary('world', 'general', { world: { general: true } }, { world: { general: { bestScore: 200, bestTimeMs: 754000 } } }),
    ).toEqual({
      flags: '248 bandeiras',
      learn: 'Aprender: 138 acertos · 🏅',
      quiz: 'Quiz: recorde 200 pts · 12:34',
    });
  });

  it('shows a best score without a time when no quiz was finished cleanly', () => {
    expect(levelSummary('oceania', 'medium', {}, { oceania: { medium: { bestScore: 5 } } }).quiz).toBe('Quiz: recorde 5 pts');
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test -- src/ui/levelSummary.test.ts`
Expected: FAIL — `./levelSummary` not found.

- [ ] **Step 3: Implement `src/ui/levelSummary.ts`**

```ts
import { countries } from '../data/countries';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../engine/pool';
import { hasMedal, type Medals } from '../progress';
import { quizRecord, type QuizRecords } from '../quizRecords';
import { formatTime } from './time';

export interface LevelSummary {
  flags: string;
  learn: string;
  quiz: string;
}

export function levelSummary(continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): LevelSummary {
  const size = poolFor(countries, continent, difficulty).length;
  const medal = hasMedal(medals, continent, difficulty) ? ' · 🏅' : '';
  const { bestScore, bestTimeMs } = quizRecord(records, continent, difficulty);
  const quiz = [bestScore === undefined ? 'sem recorde' : `recorde ${bestScore} pts`];
  if (bestTimeMs !== undefined) quiz.push(formatTime(bestTimeMs));
  return {
    flags: `${size} bandeiras`,
    learn: `Aprender: ${goalFor(difficulty, size)} acertos${medal}`,
    quiz: `Quiz: ${quiz.join(' · ')}`,
  };
}
```

Run: `npm test -- src/ui/levelSummary.test.ts`
Expected: PASS.

- [ ] **Step 4: Rewrite `src/ui/navigation.ts`**

```ts
import type { Country } from '../data/countries';
import type { ContinentKey, Difficulty } from '../engine/pool';
import type { NewRecords } from '../quizRecords';

export type Screen =
  | { name: 'home' }
  | { name: 'continent'; continent: ContinentKey }
  | { name: 'game'; continent: ContinentKey; difficulty: Difficulty }
  | { name: 'result'; continent: ContinentKey; difficulty: Difficulty; won: boolean; correct: number; missed: Country[] }
  | { name: 'quiz'; continent: ContinentKey; difficulty: Difficulty }
  | {
      name: 'quizResult';
      continent: ContinentKey;
      difficulty: Difficulty;
      score: number;
      timeMs: number;
      finished: boolean;
      unanswered: number;
      missed: Country[];
      newRecords: NewRecords;
    };

export type Navigate = (screen: Screen) => void;
```

- [ ] **Step 5: Update `src/ui/labels.ts`**

Replace the imports, `CONTINENTS` and `CONTINENT_LABEL` (keep `CONTINENT_FROM`, `DIFFICULTIES` and `DIFFICULTY_LABEL` as they are):

```ts
import type { Continent } from '../data/countries';
import type { ContinentKey, Difficulty } from '../engine/pool';

export const CONTINENT_KEYS: readonly ContinentKey[] = ['world', 'africa', 'americas', 'asia', 'europe', 'oceania'];

export const CONTINENT_LABEL: Record<ContinentKey, string> = {
  world: 'Mundo',
  africa: 'África',
  americas: 'Américas',
  asia: 'Ásia',
  europe: 'Europa',
  oceania: 'Oceania',
};
```

- [ ] **Step 6: Rewrite Início and the continent screen; delete the mode screen**

`src/ui/screens/home.ts`:

```ts
import { el } from '../dom';
import { CONTINENT_KEYS, CONTINENT_LABEL } from '../labels';
import type { Navigate } from '../navigation';

export function renderHome(root: HTMLElement, navigate: Navigate): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Bandeiras do mundo']),
      ...CONTINENT_KEYS.map((continent) =>
        el('button', { className: 'big', onclick: () => navigate({ name: 'continent', continent }) }, [CONTINENT_LABEL[continent]]),
      ),
    ]),
  );
}
```

`src/ui/screens/continent.ts`:

```ts
import type { ContinentKey } from '../../engine/pool';
import { loadMedals } from '../../progress';
import { loadQuizRecords } from '../../quizRecords';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import { levelSummary } from '../levelSummary';
import type { Navigate } from '../navigation';

export function renderContinent(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const medals = loadMedals(localStorage);
  const records = loadQuizRecords(localStorage);
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      ...DIFFICULTIES.map((difficulty) => {
        const summary = levelSummary(continent, difficulty, medals, records);
        return el('section', { className: 'level' }, [
          el('h2', {}, [DIFFICULTY_LABEL[difficulty]]),
          el('p', { className: 'detail' }, [summary.flags]),
          el('p', { className: 'detail' }, [summary.learn]),
          el('p', { className: 'detail' }, [summary.quiz]),
          el('div', { className: 'level-actions' }, [
            el('button', { className: 'primary', onclick: () => navigate({ name: 'game', continent, difficulty }) }, ['Aprender']),
            el('button', { className: 'primary', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Quiz']),
          ]),
        ]);
      }),
      el('button', { className: 'link', onclick: () => navigate({ name: 'home' }) }, ['Voltar']),
    ]),
  );
}
```

Run: `git rm src/ui/screens/difficulty.ts`

- [ ] **Step 7: Route the game, Quiz and result screens back to the continent screen**

`src/main.ts`: drop the `renderDifficulty` import and its `case 'difficulty'`; the `continent` case becomes `return renderContinent(app, navigate, screen.continent);`.

`src/ui/screens/game.ts`: import `type ContinentKey` from `../../engine/pool` (with `LEVEL_RULES, goalFor, poolFor, type Difficulty`) and drop `type Continent` from the countries import; the parameter becomes `continent: ContinentKey`; "Sair" becomes `leave({ name: 'continent', continent })`.

`src/ui/screens/quiz.ts`: import `type ContinentKey` from `../../engine/pool` with `poolFor, type Difficulty`, drop `type Continent`, and type the parameter `continent: ContinentKey`.

`src/ui/screens/result.ts` and `src/ui/screens/quizResult.ts`: "Voltar" becomes `navigate({ name: 'continent', continent })`.

Then `grep -rn "name: 'difficulty'\|\bMode\b\|mode:\|renderDifficulty\|CONTINENTS\b" src/ui src/main.ts` finds nothing.

- [ ] **Step 8: Style the level cards in `src/style.css`**

Append:

```css
.level {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.level h2 { margin: 0; }
.level .detail { margin: 0; }

.level-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}
```

- [ ] **Step 9: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

- [ ] **Step 10: Commit**

```bash
git add src/ui/levelSummary.ts src/ui/levelSummary.test.ts src/ui/navigation.ts src/ui/labels.ts src/main.ts src/ui/screens/home.ts src/ui/screens/continent.ts src/ui/screens/game.ts src/ui/screens/result.ts src/ui/screens/quiz.ts src/ui/screens/quizResult.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: start from the continent and offer Aprender and Quiz on each level" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

(`git rm` in Step 6 already staged the deletion.)

---

### Task 4: Status badge on revealed names

**Files:**
- Create: `src/ui/badge.ts`, `src/ui/badge.test.ts`
- Modify: `src/ui/labels.ts`, `src/ui/questions/feedback.ts`, `src/style.css`, `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: `Status`, `Country.status` (Task 1).
- Produces:

```ts
// src/ui/labels.ts
export const STATUS_BADGE: Record<Status, string>;
// src/ui/badge.ts
export function statusBadge(country: Country): HTMLSpanElement; // <span class="badge badge-<status>">
```

`solutionCard(country, caption)` renders the caption followed by the badge; it is the only caller of `statusBadge`.

- [ ] **Step 1: Add the DOM for tests**

Run: `npm install --save-dev happy-dom`
Expected: `package.json` gains `happy-dom` under `devDependencies`; `npm test` still passes.

- [ ] **Step 2: Write the failing test `src/ui/badge.test.ts`**

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries, similarGroups } from '../data/countries';
import { ALL_FORMATS, typeName } from '../engine/formats';
import { poolFor } from '../engine/pool';
import type { FormatContext } from '../engine/question';
import { seededRng } from '../engine/rng';
import { STATUS_BADGE } from './labels';
import { renderFeedback, solutionCard } from './questions/feedback';
import { renderQuestion } from './questions/render';

const byIso = (code: string) => countries.find((c) => c.iso2 === code)!;
const pool = poolFor(countries, 'americas', 'hard');
const ctx: FormatContext = { pool, world: countries, similarGroups, similarDistractors: true };

describe('STATUS_BADGE', () => {
  it('names every status', () => {
    expect(STATUS_BADGE).toEqual({ un: 'ONU', nonMember: 'Não-membro', ukNation: 'Nação do Reino Unido', territory: 'Território' });
  });
});

describe('badge', () => {
  it.each([
    ['br', 'ONU'],
    ['va', 'Não-membro'],
    ['gb-sct', 'Nação do Reino Unido'],
    ['ky', 'Território'],
  ])('shows the %s badge beside the name in a solution card', (code, text) => {
    const card = solutionCard(byIso(code));
    expect(card.querySelector('.badge')?.textContent).toBe(text);
    expect(card.querySelector('figcaption')?.textContent).toBe(`${byIso(code).name} ${text}`);
  });

  it('shows the badge in the feedback of a wrong answer', () => {
    const question = typeName.build(byIso('ky'), ctx, seededRng(1));
    const feedback = renderFeedback(question, { correct: false, missed: [byIso('ky')] }, () => {});
    expect(feedback.querySelector('.badge')?.textContent).toBe('Território');
  });

  it('never shows a badge inside a question', () => {
    for (const format of ALL_FORMATS) {
      for (const target of pool) {
        if (!format.canTarget(target, ctx)) continue;
        const question = format.build(target, ctx, seededRng(1));
        expect(renderQuestion(question, () => {}).querySelector('.badge')).toBeNull();
      }
    }
  });
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npm test -- src/ui/badge.test.ts`
Expected: FAIL — `STATUS_BADGE` is not exported; solution cards have no `.badge`.

- [ ] **Step 4: Add the badge text and element**

`src/ui/labels.ts`: change the countries import to `import type { Continent, Status } from '../data/countries';` and append:

```ts
export const STATUS_BADGE: Record<Status, string> = {
  un: 'ONU',
  nonMember: 'Não-membro',
  ukNation: 'Nação do Reino Unido',
  territory: 'Território',
};
```

`src/ui/badge.ts`:

```ts
import type { Country } from '../data/countries';
import { el } from './dom';
import { STATUS_BADGE } from './labels';

export function statusBadge(country: Country): HTMLSpanElement {
  return el('span', { className: `badge badge-${country.status}` }, [STATUS_BADGE[country.status]]);
}
```

`src/ui/questions/feedback.ts`: import `statusBadge` from `../badge` and make `solutionCard`:

```ts
export function solutionCard(country: Country, caption = country.name): HTMLElement {
  return el('figure', { className: 'solution-card' }, [flagImg(country), el('figcaption', {}, [caption, ' ', statusBadge(country)])]);
}
```

Append to `src/style.css`:

```css
.badge {
  display: inline-block;
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.75rem;
  white-space: nowrap;
  vertical-align: middle;
}
```

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean; `grep -rln statusBadge src/ui` lists only `src/ui/badge.ts` and `src/ui/questions/feedback.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/ui/badge.ts src/ui/badge.test.ts src/ui/labels.ts src/ui/questions/feedback.ts src/style.css package.json package-lock.json
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: badge every revealed name with its status" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 5: Browser verification and docs

**Files:**
- Modify: `README.md`, `docs/specs/2026-10-07-world-and-territories-design.md`, plus whatever the checks show broken (fix in the owning file, with an engine test when the defect is in `src/engine/`, one `fix:` commit each)

- [ ] **Step 1: Play every continent and Mundo**

Start `npx vite --host --port 5174 --strictPort` in the background and, with the Playwright browser tools at 390px width:
- Início lists Mundo, África, Américas, Ásia, Europa and Oceania, in that order, and nothing else;
- each of the six screens shows Fácil, Médio, Difícil and Geral, each with its flag count, "Aprender: N acertos", "Quiz: …" and the two buttons; the counts and goals match this table:

| | Fácil | Médio | Difícil | Geral |
|---|---|---|---|---|
| Mundo | 84 · 56 | 83 · 83 | 81 · 113 | 248 · 138 |
| África | 20 · 14 | 20 · 20 | 20 · 28 | 60 · 34 |
| Américas | 19 · 13 | 18 · 18 | 18 · 25 | 55 · 31 |
| Ásia | 17 · 12 | 17 · 17 | 16 · 23 | 50 · 28 |
| Europa | 19 · 13 | 19 · 19 | 18 · 25 | 56 · 32 |
| Oceania | 9 · 6 | 9 · 9 | 9 · 13 | 27 · 15 |

- before opening the app, set `localStorage['flags-quiz:medals']` to `{"africa":{"easy":true}}` and confirm África Fácil shows 🏅;
- one Aprender round per continent and on Mundo Fácil (answers may be read from the DOM via evaluate, but at least three questions per choice through real clicks or typing); answer one question wrong on purpose on Américas Difícil and see the badge "Território" beside the revealed name; options never carry a badge;
- on Mundo, find an odd-one-out question (play until one appears): the prompt names the continent shared by three of the flags and the fourth is from another continent;
- a Learn keyboard shortcut (`1`) still answers a choice question;
- "Sair" from a round, "Voltar" from a Learn result and "Voltar" from a Quiz result each land on that continent's screen, Mundo included;
- Quiz on Europa Fácil: type one wrong name, finish, see the badges in "Bandeiras que você errou", then see the record on the Europa screen; win a Mundo Fácil Aprender round and see 🏅 on Mundo Fácil;
- screenshots under the SDD workspace: Início, the Mundo screen, a wrong-answer feedback with a badge, the Mundo odd-one-out question, a Quiz result with badges, dark mode once.

Stop the server.

- [ ] **Step 2: Update the docs**

In `README.md`, replace everything from the line `A study app for world flags.` up to (not including) `## Run` with:

```markdown
A study app for world flags.
Pick Mundo or a continent, then one of four levels: Fácil, Médio and Difícil split each continent into three tiers, Geral holds all of them, and Mundo joins each level across every continent.
Each level shows its flag count, the Aprender medal and goal, and the Quiz best score and time, with one button for each mode.

Aprender uses eleven question formats and 3 lives per round to earn a medal, with goals scaled to the size of each level.
Choice questions can be answered with the keys 1–6, and two-option questions with ← and →.

Quiz shows one flag at a time on the same levels: type its name or skip it, come back to skipped flags whenever you like, and race the timer. The best score and, for a quiz finished with no errors, the best time are kept per level.

The game holds 248 flags: the 193 UN members, 5 states outside the UN, the 4 nations of the United Kingdom and 46 territories. Once a name is revealed after an answer, a badge beside it says which of these it is.
```

In the `## Data` section of `README.md`, replace its first paragraph with:

```markdown
`src/data/countries.json` holds every flag with its Portuguese name, continent, status (`un`, `nonMember`, `ukNation` or `territory`), tier and accepted alternative spellings. `src/data/similar-groups.json` lists the groups of look-alike flags used by the sort-similar format. Flags are the SVGs in `public/flags/`, taken from flagcdn; the US states, the flags of the EU, the UN and Antarctica, and the flags identical to another one (um, bv, sj, mf, hm) are left out. Edit the JSON files directly to change names, statuses, tiers, aliases or groups.
```

and replace `Medals live in the browser's` with `Medals and Quiz records live in the browser's`.

In `docs/specs/2026-10-07-world-and-territories-design.md`:
- replace the status line with `Status: implemented`;
- replace `That leaves 56 new flags (including the Vatican back), for 249 in total.` with `That leaves 55 new flags (including the Vatican back), for 248 in total: Ilha Heard e Ilhas McDonald renders identical to Austrália and is excluded.`;
- replace `Geral is all 249 flags` with `Geral is all 248 flags`;
- replace `Data: 249 flags` with `Data: 248 flags`.

- [ ] **Step 3: Run the gates and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: all clean.

```bash
git add README.md docs/specs/2026-10-07-world-and-territories-design.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "docs: describe Mundo, the territories and continent-first navigation" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```
