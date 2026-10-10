# Flags Quiz — Learn mode: choice first

Date: 2026-10-10
Status: approved

Changes `docs/specs/2026-10-06-learn-mode-design.md` and the level rules set by `docs/specs/2026-10-06-learn-mode-adjustments-plan.md`.

## Reasoning

Learn mode draws every question format with the same chance, so a player can be asked to type the name of a flag they have never seen in the round.
That tests the flag before it was taught.

A round now introduces each flag through a choice question, where the name is on screen, and only then asks for it in the other formats.
In the first pass every flag appears twice: once in a choice question and once more in any format.
That makes rounds longer by design, and the goals grow by about 30% to use the extra appearances.

The typed crop question leaves the game: a fragment of a flag with no options to anchor it is guesswork more than study.
The crop question with four options stays.

## Rules

**Choice formats:** `nameToFlags`, `flagToNames`, `flagToTwoNames` and `matchPairs`.
**Other formats:** `crop`, `trueFalse`, `typeName`, `oddOneOut`, `sortSimilar` and `typeSimilar`.
`cropType` is removed.

**Seen flag:** a flag that has been the target of a question in this round.
A flag shown only as a wrong option, as the intruder or as one of the other pairs in `matchPairs` is not seen, since the player never saw its name next to it.
Seen lasts the whole round and is never reset between passes.

**Which formats may target a flag:**

- An unseen flag can only be targeted by a choice format.
- A seen flag can be targeted by any format.
- `sortSimilar` and `typeSimilar` show only the group members that are seen and unspent, need at least two of them, and spend every member shown.
- A flag comes back only after at least 5 other questions (`REVIEW_GAP`), so its review is never a repeat of what the player just read.

**Spending:** a flag is spent when it is targeted while already seen.
In the first pass this means two appearances per flag, the first always a choice question; a flag introduced in the last questions of a pass can be left with one appearance.
From the second pass on every flag is already seen, so one appearance spends it and every format is open.
When no unspent flag outside the review gap can be asked, a new pass starts, missed flags first.

**Draw:** the flag first, then the format.
The flag is drawn evenly among the unspent flags outside the review gap that some format can take, and the format is drawn by weight among the formats that can take it (recall formats weigh the level's `recallWeight`, the others 1).
Drawing the format first let the review formats pull flags back early: a round of Oceania Fácil, 8 questions on 9 flags, showed 5.0 different flags on average.
Drawing the flag first with the review gap raises that to 7.3, with 96% choice questions on Fácil and 72% on Difícil (2,000 simulated rounds per level).

**Goals,** about 30% above today:

| Level | Ratio today | New ratio | Africa today | Africa new |
|---|---|---|---|---|
| Fácil | 2/3 | 13/15 | 14 | 18 |
| Médio | 1/1 | 13/10 | 20 | 26 |
| Difícil | 25/18 | 65/36 | 28 | 37 |
| Geral | 30/54 | 13/18 | 34 | 44 |

No goal goes below 15 (`MIN_GOAL`), which lifts the small levels: Oceania Fácil and Médio go to 15.

Every goal fits in the first pass, which offers two appearances per flag: the largest ratio is 65/36, below 2.

## Technical

- `src/engine/question.ts`: add `choice: boolean` to `Format`; drop `cropType` from `Question`.
- `src/engine/formats.ts`: set `choice` on each format; delete `cropType` and remove it from `ALL_FORMATS`.
- `src/engine/round.ts`: keep the question index at which each flag was last asked beside `spent`, and expose the current `pass`.
  A format may take a flag when `format.canTarget(...)` holds and either `format.choice` is true or the flag was asked before; the group formats see a pool narrowed to asked, unspent flags outside the review gap.
  After building a question, its flags that were already asked become spent, and the target's index is recorded.
- `src/engine/pool.ts`: new goal ratios in `LEVEL_RULES`.
- `src/engine/answer.ts` and `src/ui/questions/render.ts`: delete the `cropType` branches.
- Tests: `round.test.ts` covers an unseen flag never getting a non-choice format, the two appearances per flag in the first pass, the group formats showing only seen, unspent members, the review gap, how many flags a short round shows, and the second pass opening every format; `pool.test.ts` covers the new goals; the `cropType` tests go away.
- `README.md`: "eleven question formats" becomes ten, and the sentence describes the choice-first introduction.

## Unchanged

Lives, the medal, the level pools, similar distractors, Quiz mode and every player-facing string.

## Checklist

- [ ] `cropType` removed from engine, rendering and tests
- [ ] `choice` flag on every format
- [ ] Round tracks seen flags, spends on the second appearance and skips the previous target
- [ ] New goal ratios
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass
- [ ] Played in the browser on a dev server of its own: an easy round opens only with choice questions and other formats appear after a few flags
- [ ] README updated
