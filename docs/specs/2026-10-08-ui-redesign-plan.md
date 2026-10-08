# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Início, the continent screen and Progresso with one hub, give Learn and Quiz a thin top bar, turn results into stat blocks with a next-level button, and restyle the app in the single-blue game look.

**Architecture:** Plain DOM screens built with `el()` from `src/ui/dom.ts`, switched by `navigate()` in `src/main.ts` over the `Screen` union in `src/ui/navigation.ts`. The hub replaces three screens and receives its continent on the `hub` screen; the remembered continent lives in `src/continentChoice.ts` beside the other storage modules. Two small shared UI modules are added: `src/ui/topbar.ts` (games) and `src/ui/results.ts` (stat blocks and result buttons). All styling stays in `src/style.css`, guarded by a CSS-level test in `src/style.test.ts`.

**Tech Stack:** Vite, strict TypeScript, Vitest (happy-dom via `// @vitest-environment happy-dom`), no framework.

**Spec:** `docs/specs/2026-10-08-ui-redesign-design.md`. Visual reference: `.superpowers/brainstorm/566545-1791477174/content/flow.html` and `visual-style-v2.html` (option "B3 · Azul"); the spec wins on any conflict.

## Global Constraints

- Code, identifiers, comments and commit messages in English; UI copy in pt-BR exactly as the spec and this plan write it.
- No comments that narrate reasoning; match the surrounding style (2-space indent, single quotes, `el()` for every node).
- TDD: write the failing test first, run it, then implement.
- Gates at every commit: `npx tsc --noEmit`, `npm test`, `npm run build`, all passing.
- Commit with `git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "<subject>" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'`; stage files by name (`git add <paths>`, `git rm <paths>`), never `git add .`, never amend.
- Never touch the operator's dev server on port 5180. Browser checks run their own `npx vite --port 5174 --strictPort` and use the Playwright MCP; stop that server afterwards.
- No game rule, scoring, storage key or question format changes. The new storage key is `flags-quiz:continent`.
- Single-line controls never wrap (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`); answer options (`.name-option`, `.flag-option`, `.pair-flag`) and flag cards are not single-line controls and keep wrapping.

## Review Focus

- A remembered continent at the end of the tab strip (Oceania) on a 360px phone: the chosen tab must scroll into view on open (Task 2 test "scrolls the remembered tab into view").
- A quiz record saved before `completed` existed, holding only a best time, must count as completed in the tag, the tab count and the header total (Task 2 test "counts a record with a best time and no completed mark").
- Switching tabs repeatedly must replace the level cards, never append to them (Task 2 test "switches continent in place" asserts 4 cards and 1 link).
- Quiz ✕ after wrong answers must carry the error count into the result's "erros" block (Task 4 edit to the quiz test "ends the quiz and opens its result on ✕").
- The longest top bar ("Mundo · Difícil" plus timer, negative score and "0/81") at 360px must truncate the label, never wrap (Task 3 CSS test on `.topbar-label` and `.topbar-counters`; Task 5 browser check).

## File Structure

- `src/style.css` — tokens, base components, every screen's layout (all tasks).
- `src/style.test.ts` — CSS-level rules: nowrap controls, fixed flag-card layout (Task 1, extended in 2 and 3).
- `src/ui/questions/feedback.ts` — `solutionCard` gains a 4:3 flag box and a name span (Task 1).
- `src/continentChoice.ts` — load/save the remembered continent (Task 2).
- `src/ui/screens/hub.ts` — the hub (Task 2); deletes `home.ts`, `continent.ts`, `progress.ts`, `progress.test.ts`, `src/ui/levelSummary.ts`, `src/ui/levelSummary.test.ts`.
- `src/ui/topbar.ts` — the game top bar (Task 3), used by `game.ts` and `quiz.ts`.
- `src/ui/results.ts` — stat blocks and result buttons (Task 4), used by `result.ts` and `quizResult.ts`.
- `src/ui/screens/flagTable.ts`, `README.md` — Task 5.

---

### Task 1: Design tokens and base components

**Files:**
- Modify: `src/style.css` (full rewrite)
- Modify: `src/ui/questions/feedback.ts` (`solutionCard`)
- Create: `src/style.test.ts`, `src/ui/questions/feedback.test.ts`

**Interfaces:**
- Produces CSS classes later tasks use: `.primary` (filled), `.outline` (outlined), `.secondary`, `.link`, `.big`, `.card`, `.tab` / `.tab.on`, `.tag` / `.tag.ok`, `.pill`, `.badge`, `.flag-box`, `.solution-name`, `.level-actions`; tokens `--accent`, `--accent-dark`, `--accent-soft`, `--accent-ink`, `--accent-line`, `--accent-text`, `--success`, `--success-bg`, `--wrong`, `--tag-bg`, `--tag-text`, `--muted`, `--radius` (16px), `--radius-button` (14px).
- `solutionCard(country, caption?)` keeps its signature; its markup becomes `figure.solution-card > span.flag-box > img.flag` + `figcaption > span.solution-name, ' ', span.badge`. `figcaption.textContent` stays `"<name> <badge>"`, so `badge.test.ts` and `flagTable.test.ts` keep passing.

- [ ] **Step 1: Write the failing CSS test** — create `src/style.test.ts`:

```ts
// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

let rules: CSSStyleRule[];

const declared = (selector: string, property: string) =>
  rules
    .filter((rule) => rule.selectorText.split(',').map((s) => s.trim()).includes(selector))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean);

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = readFileSync('src/style.css', 'utf8');
  document.head.append(style);
  rules = [...document.styleSheets[0]!.cssRules].filter((r): r is CSSStyleRule => 'selectorText' in r);
});

describe('style.css', () => {
  it.each(['.primary', '.outline', '.secondary', '.link', '.big', '.tab', '.tag', '.pill', '.badge'])(
    'keeps %s on one line, truncating with an ellipsis',
    (selector) => {
      expect(declared(selector, 'white-space')).toContain('nowrap');
      expect(declared(selector, 'overflow')).toContain('hidden');
      expect(declared(selector, 'text-overflow')).toContain('ellipsis');
    },
  );

  it('truncates the answer field placeholder instead of wrapping it', () => {
    expect(declared('input::placeholder', 'text-overflow')).toContain('ellipsis');
  });

  it('gives every flag card a fixed 4:3 flag box, a two-line name and the badge on its own line', () => {
    expect(declared('.flag-box', 'aspect-ratio')).toContain('4 / 3');
    expect(declared('.quiz-thumb', 'aspect-ratio')).toContain('4 / 3');
    expect(declared('.solution-name', 'line-clamp')).toContain('2');
    expect(declared('.solution-name', 'min-height')).toContain('2.5em');
    expect(declared('.quiz-name', 'line-clamp')).toContain('2');
    expect(declared('.solution-card .badge', 'display')).toContain('block');
  });
});
```

- [ ] **Step 2: Write the failing card test** — create `src/ui/questions/feedback.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { solutionCard } from './feedback';

const tonga = countries.find((c) => c.iso2 === 'to')!;

describe('solutionCard', () => {
  it('puts the flag in its own box, then the name, then the badge', () => {
    const card = solutionCard(tonga);
    expect(card.firstElementChild!.className).toBe('flag-box');
    expect(card.querySelector('.flag-box img')!.getAttribute('src')).toMatch(/flags\/to\.svg$/);
    const caption = card.querySelector('figcaption')!;
    expect(caption.firstElementChild!.className).toBe('solution-name');
    expect(caption.firstElementChild!.textContent).toBe('Tonga');
    expect(caption.lastElementChild!.classList.contains('badge')).toBe(true);
  });
});
```

- [ ] **Step 3: Run both and watch them fail**

Run: `npx vitest run src/style.test.ts src/ui/questions/feedback.test.ts`
Expected: FAIL — `.outline`, `.tab`, `.tag`, `.pill` have no rules, `.flag-box` does not exist, and the card's first child is the `img`.

- [ ] **Step 4: Rewrite `src/style.css`** with exactly this content (the old `.level`, `.progress-*` and `.home-row` rules stay at the end, restyled, until Task 2 removes their screens):

```css
:root {
  --bg: #f2f6fb;
  --surface: #ffffff;
  --text: #1b2840;
  --muted: #7a8699;
  --border: #dae4f2;
  --accent: #2f6fde;
  --accent-dark: #1f4fa8;
  --accent-soft: #e0eafb;
  --accent-ink: #2459b8;
  --accent-line: #c3d5f5;
  --accent-text: #ffffff;
  --success: #1f7a48;
  --success-bg: #dff3e7;
  --wrong: #c62828;
  --tag-bg: #e9eef6;
  --tag-text: #8a95a8;
  --radius: 16px;
  --radius-button: 14px;
  --flag-edge: rgba(0, 0, 0, 0.28);
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1726;
    --surface: #18233a;
    --text: #e6edf8;
    --muted: #8d9ab0;
    --border: #26365a;
    --accent: #4d8af0;
    --accent-dark: #2a5cc0;
    --accent-soft: #1e2d4d;
    --accent-ink: #9dbcf5;
    --accent-line: #2f4677;
    --accent-text: #ffffff;
    --success: #5fd394;
    --success-bg: #153a28;
    --wrong: #ef5350;
    --tag-bg: #1f2a40;
    --tag-text: #8d9ab0;
    --flag-edge: rgba(255, 255, 255, 0.3);
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.4;
}

button {
  font: inherit;
  color: inherit;
  cursor: pointer;
}

button:disabled { cursor: not-allowed; opacity: 0.45; }

.screen {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h1 { font-size: 1.6rem; font-weight: 800; margin: 8px 0 12px; }
h2 { font-size: 1.15rem; font-weight: 800; margin: 0 0 12px; }

.detail { color: var(--muted); font-size: 0.95rem; }

.primary, .outline, .secondary, .link, .big, .tab, .tag, .pill, .badge {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

input::placeholder { text-overflow: ellipsis; }

.primary, .outline, .secondary {
  padding: 12px 18px;
  border-radius: var(--radius-button);
  font-weight: 800;
  font-size: 1.05rem;
}

.primary {
  border: 2px solid var(--accent);
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: 0 4px 0 var(--accent-dark);
}

.outline {
  border: 2px solid var(--accent);
  background: var(--surface);
  color: var(--accent-ink);
  box-shadow: 0 4px 0 var(--accent-line);
}

.secondary {
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 4px 0 var(--border);
}

.big {
  padding: 16px 20px;
  border: 2px solid var(--border);
  border-radius: var(--radius-button);
  background: var(--surface);
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 4px 0 var(--border);
}

.primary:active:not(:disabled), .outline:active:not(:disabled), .secondary:active:not(:disabled), .big:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: none;
}

.link {
  align-self: center;
  max-width: 100%;
  background: none;
  border: none;
  color: var(--accent-ink);
  font-weight: 700;
  padding: 8px 0;
}

.card {
  padding: 12px;
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 4px 0 var(--accent-soft);
}

.tab {
  flex: none;
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: 0.9rem;
  font-weight: 800;
}

.tab small { font-size: 0.8rem; font-weight: 600; opacity: 0.75; }
.tab.on { background: var(--accent); color: var(--accent-text); box-shadow: 0 3px 0 var(--accent-dark); }

.tag {
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--tag-bg);
  color: var(--tag-text);
  font-size: 0.75rem;
  font-weight: 800;
}

.tag.ok { background: var(--success-bg); color: var(--success); }

.pill {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 0.85rem;
  font-weight: 800;
}

.badge {
  display: inline-block;
  max-width: 100%;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--tag-bg);
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  vertical-align: middle;
}

.question { display: flex; flex-direction: column; gap: 12px; }
.question[inert] { opacity: 0.6; }

.stage { display: flex; flex-direction: column; gap: 16px; }

.flag {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  margin: auto;
  box-shadow: 0 0 0 1px var(--flag-edge);
}

.figure {
  height: 200px;
  padding: 8px;
  display: flex;
  background: var(--surface);
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius);
}

.crop-frame {
  overflow: hidden;
  border-radius: var(--radius);
  border: 2px solid var(--accent-soft);
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
}

.crop-frame .flag { width: 100%; max-height: none; box-shadow: none; }

.flag-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.flag-option, .pair-flag {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 2px solid var(--border);
  border-radius: var(--radius-button);
  background: var(--surface);
  box-shadow: 0 4px 0 var(--border);
}

.flag-option .flag, .pair-flag .flag { max-height: 90px; }

.name-list { display: flex; flex-direction: column; gap: 10px; }

.name-option {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-button);
  background: var(--surface);
  font-weight: 700;
  text-align: left;
  box-shadow: 0 4px 0 var(--border);
}

.chosen { border-color: var(--accent); background: var(--accent-soft); }

.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 2px var(--accent);
}

.name-option.linked { opacity: 0.5; }
.pair-flag.linked { border-color: var(--accent); }

.pair-flags {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pair-label { color: var(--text); font-weight: 700; font-size: 0.95rem; min-height: 1.3em; }

.yes-no { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }

.type-form { display: flex; flex-direction: column; gap: 10px; }

.type-form input {
  padding: 12px 14px;
  font: inherit;
  font-size: 1.1rem;
  border: 2px solid var(--accent-line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
}

.feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius);
  border: 2px solid var(--border);
  background: var(--surface);
}

.feedback.right { border-color: var(--success); }
.feedback.wrong { border-color: var(--wrong); }
.verdict { margin: 0; font-weight: 800; font-size: 1.2rem; }
.feedback.right .verdict { color: var(--success); }
.feedback.wrong .verdict { color: var(--wrong); }

.solution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  align-items: start;
}

.solution-card { margin: 0; display: flex; flex-direction: column; gap: 6px; }
.flag-box { display: flex; aspect-ratio: 4 / 3; }
.solution-card figcaption { font-size: 0.95rem; font-weight: 700; line-height: 1.25; }

.solution-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  min-height: 2.5em;
  overflow-wrap: anywhere;
}

.solution-card .badge { display: block; width: fit-content; margin-top: 4px; }

@media (min-width: 560px) {
  .flag-grid.count-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .figure { height: 260px; }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius-button);
  background: var(--surface);
}

.type-item .flag { max-height: 80px; }

.type-item input { width: 100%; min-width: 0; }

[data-hint] { position: relative; }

[data-hint]::after {
  content: attr(data-hint);
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 0.75rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

@media (hover: none) {
  [data-hint]::after { content: none; }
}

.hud {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
}

.quiz-message { margin: 0; color: var(--wrong); font-weight: 700; }
/* kept in flow (not display: none) so hiding it never resizes the dock and desyncs the grid's scroll position */
.quiz-message[hidden] { display: block; visibility: hidden; }

.quiz-screen { height: 100dvh; padding-bottom: 16px; }

.quiz-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  align-content: start;
  align-items: start;
  padding: 4px;
}

.quiz-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--surface);
}

.quiz-cell:disabled { opacity: 1; cursor: default; }
.quiz-cell.current { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }

.quiz-thumb { position: relative; display: flex; aspect-ratio: 4 / 3; }
.quiz-cell.answered .flag { opacity: 0.35; }

.quiz-cell.answered .quiz-thumb::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--success);
  font-size: 1.6rem;
  font-weight: 800;
}

.quiz-cell.missed .quiz-thumb::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--wrong);
}

.quiz-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
}

.quiz-name:empty { display: none; }

.quiz-dock {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius);
  background: var(--surface);
}

.quiz-dock .figure { height: 110px; border: none; padding: 0; }
.quiz-dock .type-form { flex-direction: row; }
.quiz-dock .type-form input { flex: 1; min-width: 0; }
.quiz-dock .type-form button { flex: none; padding: 10px 12px; font-size: 0.95rem; }

@media (min-width: 560px) {
  .quiz-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
  .quiz-dock .figure { height: 160px; }
}

.record { margin: 0; color: var(--success); font-weight: 800; }

.level-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.screen.wide { max-width: 1200px; }

.flag-table-item { padding: 0; border: none; background: none; text-align: left; }

.flag-dialog {
  max-width: min(90vw, 900px);
  padding: 16px;
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

.flag-dialog::backdrop { background: rgba(0, 0, 0, 0.6); }
.flag-dialog .flag { width: min(80vw, 860px); max-height: 70vh; object-fit: contain; box-shadow: none; }
.flag-dialog p { margin: 12px 0 0; font-size: 1.3rem; font-weight: 700; text-align: center; }

.level {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius);
  background: var(--surface);
}

.level h2 { margin: 0; }
.level .detail { margin: 0; }

.progress-total { margin: 0; font-size: 1.1rem; font-weight: 700; }
.progress-head { display: flex; justify-content: space-between; align-items: baseline; }
.progress-count { font-weight: 700; font-variant-numeric: tabular-nums; }
.progress-bar { height: 8px; border-radius: 999px; background: var(--accent-soft); overflow: hidden; margin: 4px 0; }
.progress-fill { height: 100%; background: var(--accent); }
.progress-levels { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.progress-levels li { display: flex; justify-content: space-between; font-variant-numeric: tabular-nums; }

.home-row { display: flex; gap: 10px; }
.home-row .big { flex: 1; }
```

- [ ] **Step 5: Change `solutionCard`** in `src/ui/questions/feedback.ts` to:

```ts
export function solutionCard(country: Country, caption = country.name): HTMLElement {
  return el('figure', { className: 'solution-card' }, [
    el('span', { className: 'flag-box' }, [flagImg(country)]),
    el('figcaption', {}, [el('span', { className: 'solution-name' }, [caption]), ' ', statusBadge(country)]),
  ]);
}
```

- [ ] **Step 6: Run the gates**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass (the quiz test that reads `.quiz-message[hidden]` from the stylesheet still passes, since that rule is unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/style.css src/style.test.ts src/ui/questions/feedback.ts src/ui/questions/feedback.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: restyle the app in the single-blue game look" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Hub with remembered continent, replacing Início, continent and Progresso

**Files:**
- Create: `src/continentChoice.ts`, `src/continentChoice.test.ts`, `src/ui/screens/hub.ts`, `src/ui/screens/hub.test.ts`
- Modify: `src/ui/navigation.ts`, `src/main.ts`, `src/ui/labels.ts`, `src/ui/screens/game.ts`, `src/ui/screens/result.ts`, `src/ui/screens/quizResult.ts`, `src/ui/screens/flagTable.ts`, `src/ui/screens/flagTable.test.ts`, `src/style.css`, `src/style.test.ts`
- Delete: `src/ui/screens/home.ts`, `src/ui/screens/continent.ts`, `src/ui/screens/progress.ts`, `src/ui/screens/progress.test.ts`, `src/ui/levelSummary.ts`, `src/ui/levelSummary.test.ts`

**Interfaces:**
- Consumes: `isCompleted`, `quizRecord`, `loadQuizRecords` (`src/quizRecords.ts`); `loadMedals`, `hasMedal` (`src/progress.ts`); `poolFor`, `goalFor` (`src/engine/pool.ts`); `flagImg`, `formatTime`, labels.
- Produces: `loadContinent(store): ContinentKey`, `saveContinent(store, continent): void`, `type ContinentStore`; `renderHub(root: HTMLElement, navigate: Navigate, initial: ContinentKey): void`; the screen `{ name: 'hub'; continent: ContinentKey }` (the `home`, `progress` and `continent` screens are gone); `CONTINENT_FROM` becomes `Record<ContinentKey, string>` with `world: 'do Mundo'`. Every back path in later tasks navigates to `{ name: 'hub', continent }`.

- [ ] **Step 1: Write the failing storage test** — create `src/continentChoice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadContinent, saveContinent, type ContinentStore } from './continentChoice';

function memoryStore(): ContinentStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('continent choice', () => {
  it('opens on Mundo on the first visit', () => {
    expect(loadContinent(memoryStore())).toBe('world');
  });

  it('remembers the last continent under its own key', () => {
    const store = memoryStore();
    saveContinent(store, 'oceania');
    expect(loadContinent(store)).toBe('oceania');
    expect(store.data.get('flags-quiz:continent')).toBe('oceania');
  });
});
```

- [ ] **Step 2: Write the failing hub test** — create `src/ui/screens/hub.test.ts`:

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries } from '../../data/countries';
import { goalFor, poolFor, type ContinentKey } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderHub } from './hub';

describe('renderHub', () => {
  let root: HTMLElement;
  let screens: Screen[];

  const render = (continent: ContinentKey) => {
    root = document.createElement('div');
    renderHub(root, (screen) => screens.push(screen), continent);
  };
  const tabs = () => [...root.querySelectorAll<HTMLButtonElement>('.tab')];
  const tab = (label: string) => tabs().find((t) => t.firstChild!.textContent === label)!;
  const card = (level: string) => [...root.querySelectorAll<HTMLElement>('.level-card')].find((c) => c.querySelector('h2')!.textContent === level)!;
  const tags = (level: string) => [...card(level).querySelectorAll('.tag')].map((t) => [t.textContent, t.classList.contains('ok')]);
  const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  const goal = (continent: ContinentKey, difficulty: 'easy' | 'medium' | 'hard' | 'general') =>
    goalFor(difficulty, poolFor(countries, continent, difficulty).length);

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'flags-quiz:quiz-records-v2',
      JSON.stringify({
        africa: { easy: { bestScore: 20, bestTimeMs: 192000, completed: true }, medium: { bestScore: 12, completed: true }, hard: { bestScore: 9 } },
        world: { easy: { bestScore: 84, bestTimeMs: 754000 } },
      }),
    );
    localStorage.setItem('flags-quiz:medals', JSON.stringify({ africa: { easy: true } }));
    screens = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the title and the completed quizzes out of all 24 in the header', () => {
    render('africa');
    expect(root.querySelector('.hub-header h1')!.textContent).toBe('🌍 Bandeiras');
    expect(root.querySelector('.hub-header .pill')!.textContent).toBe('3/24 quizzes');
  });

  it('shows one tab per continent in order with its completed quizzes, the chosen one filled', () => {
    render('africa');
    expect(tabs().map((t) => t.textContent)).toEqual(['Mundo 1/4', 'África 2/4', 'Américas 0/4', 'Ásia 0/4', 'Europa 0/4', 'Oceania 0/4']);
    expect(tabs().filter((t) => t.classList.contains('on'))).toEqual([tab('África')]);
  });

  it('scrolls the remembered tab into view, since the last tabs start off screen on a phone', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render('oceania');
    expect(scrolled.mock.contexts.at(-1)).toBe(tab('Oceania'));
  });

  it('remembers the continent it opens on', () => {
    render('africa');
    expect(localStorage.getItem('flags-quiz:continent')).toBe('africa');
  });

  it('switches continent in place, without changing screen, and remembers the new one', () => {
    render('africa');
    const main = root.firstElementChild;
    tab('Oceania').click();
    expect(screens).toEqual([]);
    expect(root.firstElementChild).toBe(main);
    expect(tab('Oceania').classList.contains('on')).toBe(true);
    expect(tab('África').classList.contains('on')).toBe(false);
    expect(card('Fácil').querySelector('.meta')!.textContent).toBe(`${poolFor(countries, 'oceania', 'easy').length} bandeiras`);
    expect(root.querySelectorAll('.level-card')).toHaveLength(4);
    expect(root.querySelectorAll('.see-all')).toHaveLength(1);
    expect(localStorage.getItem('flags-quiz:continent')).toBe('oceania');
  });

  it('shows each level with its flag count and the first three flags of its pool', () => {
    render('africa');
    const pool = poolFor(countries, 'africa', 'hard');
    expect([...root.querySelectorAll('.level-card h2')].map((h) => h.textContent)).toEqual(['Fácil', 'Médio', 'Difícil', 'Geral']);
    expect(card('Difícil').querySelector('.meta')!.textContent).toBe(`${pool.length} bandeiras`);
    expect([...card('Difícil').querySelectorAll('.thumbs img')].map((img) => img.getAttribute('src'))).toEqual(
      pool.slice(0, 3).map((c) => `/flags/${c.iso2}.svg`),
    );
  });

  it('tags the medal and the quiz of each level by its state', () => {
    render('africa');
    expect(tags('Fácil')).toEqual([
      ['🏅 Medalha', true],
      ['✓ Quiz 03:12', true],
    ]);
    expect(tags('Médio')).toEqual([
      [`🏅 meta ${goal('africa', 'medium')}`, false],
      ['✓ Quiz', true],
    ]);
    expect(tags('Difícil')).toEqual([
      [`🏅 meta ${goal('africa', 'hard')}`, false],
      ['Quiz 9 pts', false],
    ]);
    expect(tags('Geral')).toEqual([
      [`🏅 meta ${goal('africa', 'general')}`, false],
      ['Quiz —', false],
    ]);
  });

  it('counts a record with a best time and no completed mark as a completed quiz', () => {
    render('world');
    expect(tags('Fácil')[1]).toEqual(['✓ Quiz 12:34', true]);
  });

  it('starts Aprender and Quiz on the level of the chosen continent', () => {
    render('africa');
    button(card('Difícil'), 'Aprender').click();
    button(card('Difícil'), 'Quiz').click();
    expect(screens).toEqual([
      { name: 'game', continent: 'africa', difficulty: 'hard' },
      { name: 'quiz', continent: 'africa', difficulty: 'hard' },
    ]);
  });

  it('links to the flag table of the chosen continent', () => {
    render('africa');
    const link = root.querySelector<HTMLButtonElement>('.see-all')!;
    expect(link.textContent).toBe(`Ver as ${poolFor(countries, 'africa', 'general').length} bandeiras da África →`);
    link.click();
    expect(screens).toEqual([{ name: 'flagTable', continent: 'africa' }]);
  });

  it('words the flag table link for Mundo', () => {
    render('world');
    expect(root.querySelector('.see-all')!.textContent).toBe('Ver as 248 bandeiras do Mundo →');
  });
});
```

- [ ] **Step 3: Update the flag table back test** in `src/ui/screens/flagTable.test.ts`, replacing the `'goes back home on Voltar'` test with:

```ts
  it('goes back to the hub on the same continent on Voltar', () => {
    const root = render('oceania');
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Voltar')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });
```

Add `'.see-all'` to the selector list of the `it.each` in `src/style.test.ts`:

```ts
  it.each(['.primary', '.outline', '.secondary', '.link', '.big', '.tab', '.tag', '.pill', '.badge', '.see-all'])(
```

- [ ] **Step 4: Run them and watch them fail**

Run: `npx vitest run src/continentChoice.test.ts src/ui/screens/hub.test.ts src/ui/screens/flagTable.test.ts src/style.test.ts`
Expected: FAIL — `./continentChoice` and `./hub` cannot be resolved, Voltar still navigates to `home`, `.see-all` has no rule.

- [ ] **Step 5: Create `src/continentChoice.ts`**

```ts
import type { ContinentKey } from './engine/pool';

export type ContinentStore = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'flags-quiz:continent';

export function loadContinent(store: ContinentStore): ContinentKey {
  return (store.getItem(STORAGE_KEY) as ContinentKey | null) ?? 'world';
}

export function saveContinent(store: ContinentStore, continent: ContinentKey): void {
  store.setItem(STORAGE_KEY, continent);
}
```

- [ ] **Step 6: Change `CONTINENT_FROM`** in `src/ui/labels.ts`: the import line becomes `import type { Status } from '../data/countries';` and the map becomes

```ts
export const CONTINENT_FROM: Record<ContinentKey, string> = {
  world: 'do Mundo',
  africa: 'da África',
  americas: 'das Américas',
  asia: 'da Ásia',
  europe: 'da Europa',
  oceania: 'da Oceania',
};
```

- [ ] **Step 7: Create `src/ui/screens/hub.ts`**

```ts
import { saveContinent } from '../../continentChoice';
import { countries } from '../../data/countries';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { hasMedal, loadMedals, type Medals } from '../../progress';
import { isCompleted, loadQuizRecords, quizRecord, type QuizRecord, type QuizRecords } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_FROM, CONTINENT_KEYS, CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';

export function renderHub(root: HTMLElement, navigate: Navigate, initial: ContinentKey): void {
  const medals = loadMedals(localStorage);
  const records = loadQuizRecords(localStorage);
  const completedIn = (continent: ContinentKey) => DIFFICULTIES.filter((d) => isCompleted(quizRecord(records, continent, d))).length;
  const completed = CONTINENT_KEYS.reduce((sum, continent) => sum + completedIn(continent), 0);
  const levels = el('div', { className: 'levels' });

  const select = (continent: ContinentKey) => {
    saveContinent(localStorage, continent);
    for (const [key, tab] of tabs) tab.classList.toggle('on', key === continent);
    tabs.get(continent)!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    levels.replaceChildren(
      ...DIFFICULTIES.map((difficulty) => levelCard(navigate, continent, difficulty, medals, records)),
      el('button', { className: 'see-all', type: 'button', onclick: () => navigate({ name: 'flagTable', continent }) }, [
        `Ver as ${poolFor(countries, continent, 'general').length} bandeiras ${CONTINENT_FROM[continent]} →`,
      ]),
    );
  };

  const tabs = new Map(
    CONTINENT_KEYS.map((continent) => [
      continent,
      el('button', { className: 'tab', type: 'button', onclick: () => select(continent) }, [
        CONTINENT_LABEL[continent],
        ' ',
        el('small', {}, [`${completedIn(continent)}/${DIFFICULTIES.length}`]),
      ]),
    ]),
  );

  root.append(
    el('main', { className: 'screen hub' }, [
      el('header', { className: 'hub-header' }, [
        el('h1', {}, ['🌍 Bandeiras']),
        el('span', { className: 'pill' }, [`${completed}/${CONTINENT_KEYS.length * DIFFICULTIES.length} quizzes`]),
      ]),
      el('nav', { className: 'tabs' }, [...tabs.values()]),
      levels,
    ]),
  );
  select(initial);
}

function levelCard(navigate: Navigate, continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): HTMLElement {
  const pool = poolFor(countries, continent, difficulty);
  return el('section', { className: 'card level-card' }, [
    el('div', { className: 'level-head' }, [
      el('h2', {}, [DIFFICULTY_LABEL[difficulty]]),
      el('span', { className: 'meta' }, [`${pool.length} bandeiras`]),
      el('span', { className: 'thumbs' }, pool.slice(0, 3).map((country) => flagImg(country))),
    ]),
    el('div', { className: 'tags' }, [
      hasMedal(medals, continent, difficulty) ? tag('🏅 Medalha', true) : tag(`🏅 meta ${goalFor(difficulty, pool.length)}`, false),
      quizTag(quizRecord(records, continent, difficulty)),
    ]),
    el('div', { className: 'level-actions' }, [
      el('button', { className: 'primary', type: 'button', onclick: () => navigate({ name: 'game', continent, difficulty }) }, ['Aprender']),
      el('button', { className: 'outline', type: 'button', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Quiz']),
    ]),
  ]);
}

function quizTag(record: QuizRecord): HTMLSpanElement {
  if (isCompleted(record)) return tag(record.bestTimeMs === undefined ? '✓ Quiz' : `✓ Quiz ${formatTime(record.bestTimeMs)}`, true);
  return tag(record.bestScore === undefined ? 'Quiz —' : `Quiz ${record.bestScore} pts`, false);
}

function tag(text: string, earned: boolean): HTMLSpanElement {
  return el('span', { className: earned ? 'tag ok' : 'tag' }, [text]);
}
```

- [ ] **Step 8: Rewire navigation**

In `src/ui/navigation.ts`, replace the first four members of `Screen` (`home`, `progress`, `flagTable`, `continent`) with:

```ts
  | { name: 'hub'; continent: ContinentKey }
  | { name: 'flagTable'; continent: ContinentKey }
```

Replace `src/main.ts` with:

```ts
import './style.css';
import { loadContinent } from './continentChoice';
import type { Screen } from './ui/navigation';
import { renderFlagTable } from './ui/screens/flagTable';
import { renderGame } from './ui/screens/game';
import { renderHub } from './ui/screens/hub';
import { renderQuiz } from './ui/screens/quiz';
import { renderQuizResult } from './ui/screens/quizResult';
import { renderResult } from './ui/screens/result';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
const app = root;

// A fast double-tap on a button (e.g. "Continuar") would otherwise land its second click
// on whatever element the first click's DOM swap put under the pointer. `detail` counts
// clicks in the same spot within the OS double-click interval; the app has no legitimate
// double-click interaction, and keyboard-triggered clicks have `detail` 0.
document.addEventListener(
  'click',
  (event) => {
    if (event.detail > 1) {
      event.stopPropagation();
      event.preventDefault();
    }
  },
  { capture: true },
);

function navigate(screen: Screen): void {
  app.replaceChildren();
  switch (screen.name) {
    case 'hub':
      return renderHub(app, navigate, screen.continent);
    case 'flagTable':
      return renderFlagTable(app, navigate, screen.continent);
    case 'game':
      return renderGame(app, navigate, screen.continent, screen.difficulty);
    case 'result':
      return renderResult(app, navigate, screen);
    case 'quiz':
      return renderQuiz(app, navigate, screen.continent, screen.difficulty);
    case 'quizResult':
      return renderQuizResult(app, navigate, screen);
  }
}

navigate({ name: 'hub', continent: loadContinent(localStorage) });
```

Point every old back path at the hub (one-line edits; Tasks 3–5 restyle these screens further):
- `src/ui/screens/game.ts`: `leave({ name: 'continent', continent })` → `leave({ name: 'hub', continent })`
- `src/ui/screens/result.ts` and `src/ui/screens/quizResult.ts`: `navigate({ name: 'continent', continent })` → `navigate({ name: 'hub', continent })`
- `src/ui/screens/flagTable.ts`: `navigate({ name: 'home' })` → `navigate({ name: 'hub', continent })`

- [ ] **Step 9: Delete the replaced screens**

```bash
git rm src/ui/screens/home.ts src/ui/screens/continent.ts src/ui/screens/progress.ts src/ui/screens/progress.test.ts src/ui/levelSummary.ts src/ui/levelSummary.test.ts
```

- [ ] **Step 10: Hub styles** in `src/style.css`:
- In the nowrap rule, change the selector line to `.primary, .outline, .secondary, .link, .big, .tab, .tag, .pill, .badge, .see-all {`.
- Delete the `.level-actions { ... margin-top: 8px; }` rule (it is redefined below) and everything from `.level {` to the end of the file (`.level`, `.level h2`, `.level .detail`, all `.progress-*` and `.home-row` rules).
- Append:

```css
.hub { padding-top: 0; }

.hub-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 -16px;
  padding: 16px;
  border-radius: 0 0 var(--radius) var(--radius);
  background: var(--accent);
  color: var(--accent-text);
}

.hub-header h1 { margin: 0; font-size: 1.3rem; white-space: nowrap; }
.hub-header .pill { margin-left: auto; }

.tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin: 0 -16px;
  padding: 4px 16px 8px;
  scrollbar-width: none;
}

.levels { display: flex; flex-direction: column; gap: 14px; }
.level-card { display: flex; flex-direction: column; gap: 8px; }
.level-head { display: flex; align-items: center; gap: 8px; }
.level-head h2 { margin: 0; font-size: 1.05rem; white-space: nowrap; }
.level-head .meta { color: var(--muted); font-size: 0.85rem; white-space: nowrap; }
.thumbs { display: flex; gap: 4px; margin-left: auto; }
.thumbs .flag { height: 16px; margin: 0; border-radius: 2px; }
.tags { display: flex; gap: 6px; min-width: 0; }
.tags .tag { min-width: 0; }

.level-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.see-all {
  padding: 12px 8px;
  border: 2px dashed var(--accent-line);
  border-radius: var(--radius-button);
  background: none;
  color: var(--accent-ink);
  font-size: 0.9rem;
  font-weight: 800;
}
```

- [ ] **Step 11: Run the gates**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass; `grep -rn "'home'\|'progress'\|name: 'continent'\|levelSummary" src` prints nothing.

- [ ] **Step 12: Commit**

```bash
git add src/continentChoice.ts src/continentChoice.test.ts src/ui/screens/hub.ts src/ui/screens/hub.test.ts src/ui/navigation.ts src/main.ts src/ui/labels.ts src/ui/screens/game.ts src/ui/screens/result.ts src/ui/screens/quizResult.ts src/ui/screens/flagTable.ts src/ui/screens/flagTable.test.ts src/style.css src/style.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: replace Início, the continent screen and Progresso with one hub" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

(The `git rm` in Step 9 already staged the deletions.)

---

### Task 3: Game top bar for Learn and Quiz

**Files:**
- Create: `src/ui/topbar.ts`, `src/ui/topbar.test.ts`, `src/ui/screens/game.test.ts`
- Modify: `src/ui/screens/game.ts`, `src/ui/screens/quiz.ts`, `src/ui/screens/quiz.test.ts`, `src/style.css`, `src/style.test.ts`

**Interfaces:**
- Consumes: `{ name: 'hub', continent }` from Task 2.
- Produces: `topBar(label: string, onClose: () => void): TopBar` with `interface TopBar { element: HTMLElement; update(counters: Node[], progress: number): void }`; classes `.topbar`, `.topbar-row`, `.topbar-close`, `.topbar-label`, `.topbar-counters`, `.topbar-bar`, `.topbar-fill`, `.lives`, `.heart`, `.heart.lost`. Learn's ✕ goes to the hub; Quiz's ✕ runs `finish` (ends the quiz, opens its result). "Sair", "Encerrar" and `.hud` disappear.

- [ ] **Step 1: Write the failing top bar test** — create `src/ui/topbar.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { el } from './dom';
import { topBar } from './topbar';

describe('topBar', () => {
  it('shows a close button, the label, the counters and a progress bar', () => {
    let closed = 0;
    const bar = topBar('África · Fácil', () => closed++);
    bar.update([el('span', {}, ['02:13']), el('span', {}, ['5/20'])], 0.25);
    expect(bar.element.querySelector('.topbar-label')!.textContent).toBe('África · Fácil');
    expect(bar.element.querySelector('.topbar-counters')!.textContent).toBe('02:135/20');
    expect(bar.element.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('25%');
    bar.element.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(closed).toBe(1);
  });

  it('replaces the counters and the bar on every update', () => {
    const bar = topBar('Mundo · Geral', () => {});
    bar.update([el('span', {}, ['0/10'])], 0);
    bar.update([el('span', {}, ['1/10'])], 0.1);
    expect(bar.element.querySelector('.topbar-counters')!.textContent).toBe('1/10');
    expect(bar.element.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('10%');
  });
});
```

- [ ] **Step 2: Write the failing Learn test** — create `src/ui/screens/game.test.ts`:

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderGame } from './game';

describe('renderGame', () => {
  let root: HTMLElement;
  let screens: Screen[];

  beforeEach(() => {
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
    screens = [];
    renderGame(root, (screen) => screens.push(screen), 'oceania', 'easy');
  });

  afterEach(() => {
    root.remove();
  });

  it('shows the level, three lives, the correct answers out of the goal and an empty bar in the top bar', () => {
    const goal = goalFor('easy', poolFor(countries, 'oceania', 'easy').length);
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Oceania · Fácil');
    expect(root.querySelector('.topbar-counters')!.textContent).toBe(`♥♥♥0/${goal}`);
    expect(root.querySelectorAll('.heart.lost')).toHaveLength(0);
    expect(root.querySelector<HTMLElement>('.topbar-fill')!.style.width).toBe('0%');
  });

  it('leaves to the hub on the same continent on ✕', () => {
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });

  it('has no Sair button besides the top bar', () => {
    expect([...root.querySelectorAll('button')].map((b) => b.textContent)).not.toContain('Sair');
  });
});
```

- [ ] **Step 3: Update the Quiz test** in `src/ui/screens/quiz.test.ts`:
- Replace the `hud` helper with:

```ts
  const hud = () => root.querySelector('.topbar-counters')!.textContent;
  const fill = () => root.querySelector<HTMLElement>('.topbar-fill')!.style.width;
```

- Replace the `'ends early on Encerrar'` test with these two:

```ts
  it('shows the level in the top bar and fills its bar with the answered flags', () => {
    expect(root.querySelector('.topbar-label')!.textContent).toBe('Oceania · Fácil');
    expect(fill()).toBe('0%');
    type(bigFlag().name);
    expect(fill()).toBe(`${(1 / oceania.length) * 100}%`);
  });

  it('ends the quiz and opens its result on ✕', () => {
    type(bigFlag().name);
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({ name: 'quizResult', score: 1, finished: false });
    expect((screens[0] as Extract<Screen, { name: 'quizResult' }>).unanswered).toHaveLength(oceania.length - 1);
  });
```

- In `src/style.test.ts`, extend the `it.each` list with `'.topbar-label', '.topbar-counters'`:

```ts
  it.each(['.primary', '.outline', '.secondary', '.link', '.big', '.tab', '.tag', '.pill', '.badge', '.see-all', '.topbar-label', '.topbar-counters'])(
```

- [ ] **Step 4: Run them and watch them fail**

Run: `npx vitest run src/ui/topbar.test.ts src/ui/screens/game.test.ts src/ui/screens/quiz.test.ts src/style.test.ts`
Expected: FAIL — `../topbar` cannot be resolved, there is no `.topbar-label`/`.topbar-close` in either game, no CSS for the top bar.

- [ ] **Step 5: Create `src/ui/topbar.ts`**

```ts
import { el } from './dom';

export interface TopBar {
  element: HTMLElement;
  update(counters: Node[], progress: number): void;
}

export function topBar(label: string, onClose: () => void): TopBar {
  const counters = el('span', { className: 'topbar-counters' });
  const fill = el('span', { className: 'topbar-fill' });
  const element = el('header', { className: 'topbar' }, [
    el('div', { className: 'topbar-row' }, [
      el('button', { className: 'topbar-close', type: 'button', ariaLabel: 'Fechar', onclick: onClose }, ['✕']),
      el('span', { className: 'topbar-label' }, [label]),
      counters,
    ]),
    el('div', { className: 'topbar-bar' }, [fill]),
  ]);
  return {
    element,
    update(items, progress) {
      counters.replaceChildren(...items);
      fill.style.width = `${progress * 100}%`;
    },
  };
}
```

- [ ] **Step 6: Replace `src/ui/screens/game.ts`** with:

```ts
import { countries, similarGroups } from '../../data/countries';
import { LEVEL_RULES, goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { Round, STARTING_LIVES } from '../../engine/round';
import { awardMedal } from '../../progress';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { renderQuestion } from '../questions/render';
import { topBar } from '../topbar';

export function renderGame(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const rules = LEVEL_RULES[difficulty];
  const pool = poolFor(countries, continent, difficulty);
  const round = new Round(
    { pool, world: countries, similarGroups, similarDistractors: rules.similarDistractors },
    { correctToWin: goalFor(difficulty, pool.length), recallWeight: rules.recallWeight },
    Math.random,
  );
  const stage = el('section', { className: 'stage' });

  let currentQuestion: HTMLElement | null = null;
  const onKey = (event: KeyboardEvent) => {
    if (currentQuestion) pressShortcut(currentQuestion, event);
  };
  document.addEventListener('keydown', onKey);

  const leave = (screen: Screen) => {
    document.removeEventListener('keydown', onKey);
    navigate(screen);
  };

  const bar = topBar(`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, () => leave({ name: 'hub', continent }));
  root.append(el('main', { className: 'screen' }, [bar.element, stage]));

  const updateHud = () =>
    bar.update(
      [
        el(
          'span',
          { className: 'lives' },
          Array.from({ length: STARTING_LIVES }, (_, life) => el('span', { className: life < round.lives ? 'heart' : 'heart lost' }, ['♥'])),
        ),
        el('span', {}, [`${round.correct}/${round.correctToWin}`]),
      ],
      round.correct / round.correctToWin,
    );

  const finish = () => {
    const won = round.status === 'won';
    if (won) awardMedal(localStorage, continent, difficulty);
    leave({ name: 'result', continent, difficulty, won, correct: round.correct, missed: round.missed });
  };

  const ask = () => {
    const question = round.nextQuestion();
    const questionEl = renderQuestion(question, (answer) => {
      questionEl.inert = true;
      const result = round.answer(answer);
      updateHud();
      const feedback = renderFeedback(question, result, () => (round.status === 'playing' ? ask() : finish()));
      stage.append(feedback);
      feedback.querySelector('button')?.focus();
    });
    currentQuestion = questionEl;
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
```

- [ ] **Step 7: Replace `src/ui/screens/quiz.ts`** with:

```ts
import { countries, type Country } from '../../data/countries';
import { poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { Quiz } from '../../engine/quiz';
import { saveQuizOutcome } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';
import { topBar } from '../topbar';

export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const quiz = new Quiz(poolFor(countries, continent, difficulty), Math.random);
  const startedAt = performance.now();
  const elapsed = () => performance.now() - startedAt;

  const timer = el('span', {}, [formatTime(0)]);
  const interval = window.setInterval(() => {
    timer.textContent = formatTime(elapsed());
  }, 1000);
  const finish = () => {
    window.clearInterval(interval);
    if (quiz.status === 'playing') quiz.end();
    const timeMs = elapsed();
    const finished = quiz.status === 'finished';
    const newRecords = saveQuizOutcome(localStorage, continent, difficulty, { score: quiz.score, timeMs, finished, errors: quiz.errors });
    navigate({
      name: 'quizResult',
      continent,
      difficulty,
      score: quiz.score,
      timeMs,
      finished,
      unanswered: quiz.unanswered,
      missed: quiz.missed,
      newRecords,
    });
  };
  const bar = topBar(`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, finish);

  const figure = el('div', { className: 'figure' });
  const message = el('p', { className: 'quiz-message', hidden: true }, ['Errado, tente de novo']);
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: 'Nome',
  });
  const skip = el('button', { className: 'secondary', type: 'button' }, ['Pular']);
  const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder']), skip]);

  const cells = new Map<Country, { cell: HTMLButtonElement; name: HTMLSpanElement }>();

  const paint = () => {
    bar.update([timer, el('span', {}, [`${quiz.score} pts`]), el('span', {}, [`${quiz.answeredCount}/${quiz.total}`])], quiz.answeredCount / quiz.total);
    for (const [country, { cell, name }] of cells) {
      const state = quiz.stateOf(country.iso2);
      cell.className = `quiz-cell ${state}`;
      cell.classList.toggle('current', country === quiz.current);
      cell.disabled = state === 'answered';
      name.textContent = state === 'answered' ? country.name : '';
    }
    figure.replaceChildren(flagImg(quiz.current));
  };

  const pick = (country: Country) => {
    if (country !== quiz.current) {
      quiz.select(country.iso2);
      input.value = '';
      message.hidden = true;
      paint();
    }
    input.focus();
  };

  const grid = el(
    'div',
    { className: 'quiz-grid' },
    quiz.flags.map((country) => {
      const name = el('span', { className: 'quiz-name' });
      const cell = el('button', { className: 'quiz-cell', type: 'button', onclick: () => pick(country) }, [
        el('span', { className: 'quiz-thumb' }, [flagImg(country, 'flag', 'lazy')]),
        name,
      ]);
      cells.set(country, { cell, name });
      return cell;
    }),
  );

  skip.onclick = () => {
    quiz.skip();
    input.value = '';
    message.hidden = true;
    paint();
    cells.get(quiz.current)!.cell.scrollIntoView({ block: 'nearest' });
    input.focus();
  };

  form.onsubmit = (event) => {
    event.preventDefault();
    if (input.value.trim() === '') {
      input.value = '';
      return;
    }
    const right = quiz.answer(input.value);
    input.value = '';
    if (quiz.status !== 'playing') return finish();
    message.hidden = right;
    paint();
    if (right) cells.get(quiz.current)!.cell.scrollIntoView({ block: 'nearest' });
    input.focus();
  };

  root.append(
    el('main', { className: 'screen quiz-screen' }, [bar.element, grid, el('div', { className: 'quiz-dock' }, [figure, message, form])]),
  );
  paint();
  input.focus();
}
```

- [ ] **Step 8: Top bar styles** in `src/style.css`:
- Change the nowrap rule's selector line to `.primary, .outline, .secondary, .link, .big, .tab, .tag, .pill, .badge, .see-all, .topbar-label, .topbar-counters {`.
- Delete the `.hud { ... }` rule.
- Append:

```css
.topbar { display: flex; flex-direction: column; gap: 8px; }

.topbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.topbar-close {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 800;
}

.topbar-label { flex: 1 1 auto; min-width: 0; }
.topbar-counters { flex: none; display: flex; gap: 10px; }
.topbar-bar { height: 8px; border-radius: 999px; background: var(--accent-soft); overflow: hidden; }
.topbar-fill { display: block; height: 100%; border-radius: 999px; background: var(--accent); transition: width 0.2s; }
.heart { color: var(--wrong); }
.heart.lost { color: var(--tag-bg); }
```

- [ ] **Step 9: Run the gates**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/ui/topbar.ts src/ui/topbar.test.ts src/ui/screens/game.ts src/ui/screens/game.test.ts src/ui/screens/quiz.ts src/ui/screens/quiz.test.ts src/style.css src/style.test.ts
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: give Learn and Quiz a thin top bar that leads back" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 4: Result screens with stat blocks and the next level

**Files:**
- Create: `src/ui/results.ts`, `src/ui/results.test.ts`, `src/ui/screens/result.test.ts`
- Modify: `src/ui/screens/result.ts`, `src/ui/screens/quizResult.ts`, `src/ui/screens/quizResult.test.ts`, `src/ui/navigation.ts`, `src/ui/screens/quiz.ts`, `src/ui/screens/quiz.test.ts`, `src/style.css`

**Interfaces:**
- Consumes: `DIFFICULTIES`, `DIFFICULTY_LABEL` (`src/ui/labels.ts`), `solutionCard`, `formatTime`, `.card`/`.primary`/`.outline`/`.link` from Task 1, the `hub` screen from Task 2.
- Produces: `statBlocks(stats: [value: string, label: string][]): HTMLElement` (`div.stats > div.card.stat > b + span`); `resultActions(navigate: Navigate, mode: 'game' | 'quiz', continent: ContinentKey, difficulty: Difficulty): HTMLElement` (`div.result-actions`); the `quizResult` screen gains `errors: number`, filled from `quiz.errors`.

- [ ] **Step 1: Write the failing helper test** — create `src/ui/results.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { Screen } from './navigation';
import { resultActions, statBlocks } from './results';

describe('statBlocks', () => {
  it('shows each number above its label', () => {
    const stats = statBlocks([
      ['18', 'pontos'],
      ['03:12', 'tempo'],
    ]);
    expect([...stats.querySelectorAll('.stat')].map((s) => [s.querySelector('b')!.textContent, s.querySelector('span')!.textContent])).toEqual([
      ['18', 'pontos'],
      ['03:12', 'tempo'],
    ]);
  });
});

describe('resultActions', () => {
  const render = (mode: 'game' | 'quiz', difficulty: 'easy' | 'medium' | 'hard' | 'general') => {
    const screens: Screen[] = [];
    const actions = resultActions((screen) => screens.push(screen), mode, 'africa', difficulty);
    const buttons = [...actions.querySelectorAll('button')];
    return { screens, buttons, labels: buttons.map((b) => [b.textContent, b.className]) };
  };

  it('offers the next level first, filled, then Jogar de novo outlined and Voltar ao início as a link', () => {
    expect(render('quiz', 'easy').labels).toEqual([
      ['Próximo nível: Médio →', 'primary'],
      ['Jogar de novo', 'outline'],
      ['Voltar ao início', 'link'],
    ]);
  });

  it.each([
    ['easy', 'medium'],
    ['medium', 'hard'],
    ['hard', 'general'],
  ] as const)('opens the same mode on the level after %s', (difficulty, next) => {
    for (const mode of ['game', 'quiz'] as const) {
      const { screens, buttons } = render(mode, difficulty);
      buttons[0].click();
      expect(screens).toEqual([{ name: mode, continent: 'africa', difficulty: next }]);
    }
  });

  it('has no next level after Geral and fills Jogar de novo instead', () => {
    expect(render('game', 'general').labels).toEqual([
      ['Jogar de novo', 'primary'],
      ['Voltar ao início', 'link'],
    ]);
  });

  it('plays the same level again and goes back to the hub on the same continent', () => {
    const { screens, buttons } = render('game', 'hard');
    buttons[1].click();
    buttons[2].click();
    expect(screens).toEqual([
      { name: 'game', continent: 'africa', difficulty: 'hard' },
      { name: 'hub', continent: 'africa' },
    ]);
  });
});
```

- [ ] **Step 2: Write the failing Learn result test** — create `src/ui/screens/result.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import type { Screen } from '../navigation';
import { renderResult } from './result';

const tonga = countries.find((c) => c.iso2 === 'to')!;
const goal = goalFor('medium', poolFor(countries, 'oceania', 'medium').length);

function render(overrides: Partial<Extract<Screen, { name: 'result' }>>) {
  const root = document.createElement('div');
  const screens: Screen[] = [];
  renderResult(root, (screen) => screens.push(screen), {
    name: 'result',
    continent: 'oceania',
    difficulty: 'medium',
    won: false,
    correct: 3,
    missed: [],
    ...overrides,
  });
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
  return { root, screens, button };
}

describe('renderResult', () => {
  it('celebrates a won medal and shows the level and the correct answers out of the goal', () => {
    const { root } = render({ won: true, correct: goal });
    expect(root.querySelector('h1')!.textContent).toBe('🏅 Medalha conquistada!');
    expect(root.querySelector('.detail')!.textContent).toBe('Oceania · Médio');
    expect([...root.querySelectorAll('.stat')].map((s) => s.textContent)).toEqual([`${goal}/${goal}acertos`]);
  });

  it('keeps the not-won title', () => {
    expect(render({}).root.querySelector('h1')!.textContent).toBe(`Você fez 3 de ${goal}`);
  });

  it('opens Aprender on the next level and goes back to the hub on the same continent', () => {
    const { screens, button } = render({});
    button('Próximo nível: Difícil →').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'game', continent: 'oceania', difficulty: 'hard' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('lists the flags to review with their names and badges below the buttons', () => {
    const { root } = render({ missed: [tonga] });
    const heading = [...root.querySelectorAll('h2')].find((h) => h.textContent === 'Bandeiras para revisar')!;
    expect(heading.compareDocumentPosition(root.querySelector('.result-actions')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(heading.nextElementSibling!.querySelector('figcaption')!.textContent).toBe('Tonga ONU');
  });
});
```

- [ ] **Step 3: Replace `src/ui/screens/quizResult.test.ts`** with:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countries } from '../../data/countries';
import type { Screen } from '../navigation';
import { renderQuizResult } from './quizResult';

const [fiji, tonga, samoa] = ['fj', 'to', 'ws'].map((iso2) => countries.find((c) => c.iso2 === iso2)!);

function render(overrides: Partial<Extract<Screen, { name: 'quizResult' }>>, screens: Screen[] = []): HTMLElement {
  const root = document.createElement('div');
  renderQuizResult(root, (screen) => screens.push(screen), {
    name: 'quizResult',
    continent: 'oceania',
    difficulty: 'easy',
    score: 0,
    timeMs: 0,
    errors: 0,
    finished: false,
    unanswered: [],
    missed: [],
    newRecords: { score: false, time: false },
    ...overrides,
  });
  return root;
}

const sectionNames = (root: HTMLElement, heading: string) => {
  const h2 = [...root.querySelectorAll('h2')].find((h) => h.textContent === heading);
  return h2 ? [...h2.nextElementSibling!.querySelectorAll('.solution-card')].map((card) => card.textContent) : null;
};

describe('renderQuizResult', () => {
  it('celebrates a finished quiz and shows points, time and errors as stat blocks', () => {
    const root = render({ finished: true, score: 18, timeMs: 192000, errors: 2 });
    expect(root.querySelector('h1')!.textContent).toBe('🎉 Quiz concluído!');
    expect(root.querySelector('.detail')!.textContent).toBe('Oceania · Fácil');
    expect([...root.querySelectorAll('.stat')].map((s) => [s.querySelector('b')!.textContent, s.querySelector('span')!.textContent])).toEqual([
      ['18', 'pontos'],
      ['03:12', 'tempo'],
      ['2', 'erros'],
    ]);
  });

  it('titles a quiz ended early as ended', () => {
    expect(render({}).querySelector('h1')!.textContent).toBe('Quiz encerrado');
  });

  it('keeps the new record lines', () => {
    const root = render({ finished: true, newRecords: { score: true, time: true } });
    expect([...root.querySelectorAll('.record')].map((p) => p.textContent)).toEqual(['🏆 Novo recorde de pontos!', '🏆 Novo recorde de tempo!']);
  });

  it('opens the quiz of the next level and goes back to the hub on the same continent', () => {
    const screens: Screen[] = [];
    const root = render({ finished: true }, screens);
    const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
    button('Próximo nível: Médio →').click();
    button('Voltar ao início').click();
    expect(screens).toEqual([
      { name: 'quiz', continent: 'oceania', difficulty: 'medium' },
      { name: 'hub', continent: 'oceania' },
    ]);
  });

  it('lists the unanswered flags with their names, like the wrong ones', () => {
    const root = render({ unanswered: [tonga, samoa], missed: [fiji] });
    expect(sectionNames(root, 'Bandeiras sem resposta (2)')!.map((t) => t!.startsWith(tonga.name) || t!.startsWith(samoa.name))).toEqual([true, true]);
    expect(sectionNames(root, 'Bandeiras que você errou')).toHaveLength(1);
  });

  it('shows no unanswered section when the quiz was finished', () => {
    const root = render({ finished: true });
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent)).not.toContain('Bandeiras sem resposta (0)');
  });
});
```

- [ ] **Step 4: Assert the error count in the Quiz test** (`src/ui/screens/quiz.test.ts`):
- In `'hands a finished quiz to the result screen once every flag is answered'`, add `errors: 0,` after `score: oceania.length,` in the `toMatchObject`.
- Replace the body of `'ends the quiz and opens its result on ✕'` with:

```ts
    type('nenhum país');
    type(bigFlag().name);
    root.querySelector<HTMLButtonElement>('.topbar-close')!.click();
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({ name: 'quizResult', score: 0, errors: 1, finished: false });
    expect((screens[0] as Extract<Screen, { name: 'quizResult' }>).unanswered).toHaveLength(oceania.length - 1);
```

- [ ] **Step 5: Run them and watch them fail**

Run: `npx vitest run src/ui/results.test.ts src/ui/screens/result.test.ts src/ui/screens/quizResult.test.ts src/ui/screens/quiz.test.ts`
Expected: FAIL — `../results` cannot be resolved, no stat blocks or "Próximo nível" buttons, `errors` missing from the quiz result screen (also a `tsc` error on the test's `errors: 0`).

- [ ] **Step 6: Create `src/ui/results.ts`**

```ts
import type { ContinentKey, Difficulty } from '../engine/pool';
import { el } from './dom';
import { DIFFICULTIES, DIFFICULTY_LABEL } from './labels';
import type { Navigate } from './navigation';

export function statBlocks(stats: [value: string, label: string][]): HTMLElement {
  return el(
    'div',
    { className: 'stats' },
    stats.map(([value, label]) => el('div', { className: 'card stat' }, [el('b', {}, [value]), el('span', {}, [label])])),
  );
}

export function resultActions(navigate: Navigate, mode: 'game' | 'quiz', continent: ContinentKey, difficulty: Difficulty): HTMLElement {
  const next: Difficulty | undefined = DIFFICULTIES[DIFFICULTIES.indexOf(difficulty) + 1];
  return el('div', { className: 'result-actions' }, [
    ...(next
      ? [
          el('button', { className: 'primary', type: 'button', onclick: () => navigate({ name: mode, continent, difficulty: next }) }, [
            `Próximo nível: ${DIFFICULTY_LABEL[next]} →`,
          ]),
        ]
      : []),
    el('button', { className: next ? 'outline' : 'primary', type: 'button', onclick: () => navigate({ name: mode, continent, difficulty }) }, [
      'Jogar de novo',
    ]),
    el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar ao início']),
  ]);
}
```

- [ ] **Step 7: Carry the error count.** In `src/ui/navigation.ts`, add `errors: number;` after `timeMs: number;` in the `quizResult` member. In `src/ui/screens/quiz.ts`, add `errors: quiz.errors,` after `timeMs,` in the `navigate({ name: 'quizResult', ... })` call inside `finish`.

- [ ] **Step 8: Replace `src/ui/screens/result.ts`** with:

```ts
import { countries } from '../../data/countries';
import { goalFor, poolFor } from '../../engine/pool';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';
import { resultActions, statBlocks } from '../results';

export function renderResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'result' }>): void {
  const { continent, difficulty, won, correct, missed } = screen;
  const goal = goalFor(difficulty, poolFor(countries, continent, difficulty).length);
  const review = missed.length
    ? [el('h2', {}, ['Bandeiras para revisar']), el('div', { className: 'solution-grid' }, missed.map((c) => solutionCard(c)))]
    : [];
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [won ? '🏅 Medalha conquistada!' : `Você fez ${correct} de ${goal}`]),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([[`${correct}/${goal}`, 'acertos']]),
      resultActions(navigate, 'game', continent, difficulty),
      ...review,
    ]),
  );
}
```

- [ ] **Step 9: Replace `src/ui/screens/quizResult.ts`** with:

```ts
import type { Country } from '../../data/countries';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';
import { resultActions, statBlocks } from '../results';
import { formatTime } from '../time';

export function renderQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'quizResult' }>): void {
  const { continent, difficulty, score, timeMs, errors, finished, unanswered, missed, newRecords } = screen;
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [finished ? '🎉 Quiz concluído!' : 'Quiz encerrado']),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([
        [String(score), 'pontos'],
        [formatTime(timeMs), 'tempo'],
        [String(errors), 'erros'],
      ]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      resultActions(navigate, 'quiz', continent, difficulty),
      ...solutionSection(`Bandeiras sem resposta (${unanswered.length})`, finished ? [] : unanswered),
      ...solutionSection('Bandeiras que você errou', missed),
    ]),
  );
}

function solutionSection(heading: string, flags: Country[]): HTMLElement[] {
  return flags.length ? [el('h2', {}, [heading]), el('div', { className: 'solution-grid' }, flags.map((c) => solutionCard(c)))] : [];
}
```

- [ ] **Step 10: Result styles** — append to `src/style.css`:

```css
.result h1 { margin: 16px 0 0; font-size: 1.5rem; text-align: center; }
.result > .detail { margin: 0; text-align: center; }
.result .record { text-align: center; }
.result h2 { margin: 12px 0 0; }

.stats { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; }
.stat { display: flex; flex-direction: column; align-items: center; padding: 8px; }
.stat b { font-size: 1.4rem; font-variant-numeric: tabular-nums; }
.stat span { color: var(--muted); font-size: 0.8rem; }

.result-actions { display: flex; flex-direction: column; gap: 12px; margin: 8px 0; }
```

- [ ] **Step 11: Run the gates**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add src/ui/results.ts src/ui/results.test.ts src/ui/screens/result.ts src/ui/screens/result.test.ts src/ui/screens/quizResult.ts src/ui/screens/quizResult.test.ts src/ui/navigation.ts src/ui/screens/quiz.ts src/ui/screens/quiz.test.ts src/style.css
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: show results as stat blocks with a next-level button" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 5: Flag table restyle, README and browser verification

**Files:**
- Modify: `src/ui/screens/flagTable.ts`, `src/ui/screens/flagTable.test.ts`, `src/style.css`, `README.md`

**Interfaces:**
- Consumes: `.link`, `.flag-box`, `.solution-name` (Task 1), the `hub` screen (Task 2).
- Produces: `header.table-head` holding the title, the count and "Voltar"; `.flag-table-item` styled as a card.

- [ ] **Step 1: Write the failing test** — append inside the `describe` of `src/ui/screens/flagTable.test.ts`:

```ts
  it('puts Voltar in the header, above the flags', () => {
    const root = render('world');
    const back = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Voltar')!;
    expect(back.closest('.table-head')).not.toBeNull();
    expect(back.compareDocumentPosition(root.querySelector('.solution-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/ui/screens/flagTable.test.ts`
Expected: FAIL — `back.closest('.table-head')` is null.

- [ ] **Step 3: Replace `src/ui/screens/flagTable.ts`** with:

```ts
import { countries, type Country } from '../../data/countries';
import { poolFor, type ContinentKey } from '../../engine/pool';
import { statusBadge } from '../badge';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { solutionCard } from '../questions/feedback';

export function renderFlagTable(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const flags = poolFor(countries, continent, 'general').sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const dialog = el('dialog', { className: 'flag-dialog', onclick: () => dialog.close() });
  const show = (country: Country) => {
    dialog.replaceChildren(flagImg(country), el('p', {}, [country.name, ' ', statusBadge(country)]));
    dialog.showModal();
  };
  root.append(
    el('main', { className: 'screen wide' }, [
      el('header', { className: 'table-head' }, [
        el('h1', {}, [CONTINENT_LABEL[continent]]),
        el('span', { className: 'detail' }, [`${flags.length} bandeiras`]),
        el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar']),
      ]),
      el(
        'div',
        { className: 'solution-grid' },
        flags.map((c) => el('button', { className: 'flag-table-item', type: 'button', onclick: () => show(c) }, [solutionCard(c)])),
      ),
      dialog,
    ]),
  );
}
```

- [ ] **Step 4: Flag table styles** in `src/style.css`, replace the one-line `.flag-table-item { padding: 0; border: none; background: none; text-align: left; }` rule with:

```css
.table-head { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.table-head h1 { margin: 0; white-space: nowrap; }
.table-head .detail { white-space: nowrap; }
.table-head .link { margin-left: auto; }

.flag-table-item {
  padding: 8px;
  border: 2px solid var(--accent-soft);
  border-radius: var(--radius-button);
  background: var(--surface);
  text-align: left;
  box-shadow: 0 4px 0 var(--accent-soft);
}
```

- [ ] **Step 5: README.** In `README.md`, replace the two sentences after "A study app for world flags." (from "Pick Mundo or a continent" through "with one button for each mode.") with:

```markdown
The app opens on a hub with one tab per continent and Mundo, and remembers the last one chosen.
Fácil, Médio and Difícil split each continent into three tiers, Geral holds all of them, and Mundo joins each level across every continent.
The header counts the quizzes completed (every flag answered, errors allowed) out of the 24 levels, and each tab counts its own out of 4.
Each level card shows its flag count and first flags, a medal tag with the Aprender goal, a Quiz tag with the best time or score, and one button for each mode.
```

Replace the "Progresso, from the home screen, …" paragraph and the "The \"Bandeiras\" button beside each continent …" paragraph with:

```markdown
Every game has a thin top bar: ✕ goes back to the hub (in Quiz it ends the quiz and shows its result), beside the level, its counters and a progress bar.
Results show the numbers as blocks, the new records, and the next level, another try or the way back to the hub, above the flags to review.

The link under the level cards lists every flag of the continent with its name and badge, in alphabetical order, for review; tap one to see it large.
```

- [ ] **Step 6: Run the gates**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Browser verification at 360, 390 and 1440px.** Start `npx vite --port 5174 --strictPort` in the background (never port 5180). With the Playwright MCP, at each width (`browser_resize` 360×780, 390×844, 1440×900) take a full-page screenshot of: the hub (tap Oceania first, then reload to confirm it reopens on Oceania with the tab visible), a Learn question (Aprender on any level), the Quiz grid (Quiz on Mundo · Difícil, the longest top bar), the Quiz result (✕ right away), the Learn result (Aprender on Oceania · Fácil, answer wrong three times: pick a wrong option or type "x"), and the flag table (link under the cards). On every screen run this check with `browser_evaluate`; both arrays must be empty and `overflow` must equal the viewport width:

```js
() => {
  const single = '.primary, .outline, .secondary, .link, .big, .tab, .tag, .pill, .badge, .see-all, .topbar-label, .topbar-counters';
  const spread = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = [...range.getClientRects()].map((rect) => rect.top);
    return tops.length ? Math.max(...tops) - Math.min(...tops) : 0;
  };
  const wrapped = [...document.querySelectorAll(single)]
    .filter((el) => el.getClientRects().length)
    .filter((el) => getComputedStyle(el).whiteSpace !== 'nowrap' || spread(el) > parseFloat(getComputedStyle(el).fontSize))
    .map((el) => `${el.className}: ${el.textContent}`);
  const misaligned = [];
  for (const grid of document.querySelectorAll('.solution-grid, .quiz-grid')) {
    const rows = new Map();
    for (const card of grid.children) {
      const top = Math.round(card.getBoundingClientRect().top);
      const name = card.querySelector('.solution-name, .quiz-name:not(:empty)');
      const badge = card.querySelector('.badge');
      if (!rows.has(top)) rows.set(top, { name: new Set(), badge: new Set() });
      if (name) rows.get(top).name.add(Math.round(name.getBoundingClientRect().top));
      if (badge) rows.get(top).badge.add(Math.round(badge.getBoundingClientRect().top));
    }
    for (const [top, row] of rows) if (row.name.size > 1 || row.badge.size > 1) misaligned.push(`${grid.className} row at ${top}`);
  }
  return { wrapped, misaligned, overflow: document.documentElement.scrollWidth };
}
```

Look at each screenshot against `flow.html`: blue header with the pill, tabs with x/4, cards with two tags and Aprender filled / Quiz outlined, the top bar with ✕ and a bar, stat blocks, "Próximo nível" filled. Also check one screen with `browser_emulate_media` `colorScheme: 'dark'`. Stop the 5174 server afterwards. Fix any wrap or misalignment in `src/style.css` (rerun the gates) before committing; report the three widths checked and the evaluate results.

- [ ] **Step 8: Commit**

```bash
git add src/ui/screens/flagTable.ts src/ui/screens/flagTable.test.ts src/style.css README.md
git -c user.name="Claude Code (Nexus agent)" -c user.email="claude-code@nexus.lan" commit -m "feat: restyle the flag table and describe the hub in the README" -m $'Nexus-Agent: claude-code\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```
