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
- The flag targeted by the previous question is never targeted again right away; when it is the only unspent flag left, a new pass starts instead.

**Spending:** a flag is spent when it is targeted while already seen.
In the first pass this means two appearances per flag, the first always a choice question.
From the second pass on every flag is already seen, so one appearance spends it and every format is open.
When no format can target an unspent flag, a new pass starts as today, missed flags first.

**Format draw:** unchanged.
A format is eligible when it can target at least one candidate; the format is drawn by weight (recall formats weigh the level's `recallWeight`, the others 1) and the target is drawn among the candidates it can take.

**Goals,** about 30% above today:

| Level | Ratio today | New ratio | Africa today | Africa new |
|---|---|---|---|---|
| Fácil | 2/3 | 13/15 | 14 | 18 |
| Médio | 1/1 | 13/10 | 20 | 26 |
| Difícil | 25/18 | 65/36 | 28 | 37 |
| Geral | 30/54 | 13/18 | 34 | 44 |

Every goal fits in the first pass, which offers two appearances per flag: the largest ratio is 65/36, below 2.

## Technical

- `src/engine/question.ts`: add `choice: boolean` to `Format`; drop `cropType` from `Question`.
- `src/engine/formats.ts`: set `choice` on each format; delete `cropType` and remove it from `ALL_FORMATS`.
- `src/engine/round.ts`: keep a `seen` set beside `spent` and the previous target's code.
  A format may take a candidate when `format.canTarget(...)` holds and either `format.choice` is true or the candidate is seen; the group formats see a pool narrowed to seen, unspent flags.
  After building a question, its targets that were already seen become spent, and the question's target becomes seen.
  The previous target is never a candidate.
- `src/engine/pool.ts`: new goal ratios in `LEVEL_RULES`.
- `src/engine/answer.ts` and `src/ui/questions/render.ts`: delete the `cropType` branches.
- Tests: `round.test.ts` covers an unseen flag never getting a non-choice format, the two appearances per flag in the first pass, the group formats showing only seen, unspent members, the no-immediate-repeat rule and the second pass opening every format; `pool.test.ts` covers the new goals; the `cropType` tests go away.
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
