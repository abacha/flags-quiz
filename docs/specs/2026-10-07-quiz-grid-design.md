# Flags Quiz — Quiz grid design

Date: 2026-10-07
Status: implemented

## Goal

Quiz shows every flag of the level at once as a grid, marks the ones already answered, and lets the player answer them in any order.
It replaces the one-flag-at-a-time view and the skip mechanism of `docs/specs/2026-10-06-quiz-mode-design.md`; scoring, timer, records and the result screen stay as that spec defines them.

Success means a player sees the whole level as a grid, answers the highlighted flag in the field below, taps any other flag to switch to it, and watches answered flags fill in with a check and their name.

## Screen

- Top: the timer, the score and "N/M" answered, as today, plus "Encerrar".
- Middle: a grid of every flag in the level, in the quiz's random order. The grid scrolls; on a phone the thumbnails are small (about 4–5 per row at 390px), on a desktop larger.
- The current flag is highlighted in the grid and also shown large above the answer field.
- Bottom, fixed to the bottom of the viewport: the text field, "Responder" and "Pular". The field keeps focus after every answer.

## Grid states

| State | Look |
|---|---|
| Not answered | the flag, plain |
| Current | the flag with a strong outline |
| Answered | the flag dimmed, a ✓ over it, and its name below |
| Missed at least once, not yet answered | the flag with a small red mark; the name stays hidden |

## Flow

- The quiz starts on the first flag of the grid.
- **Tap a flag** that is not answered: it becomes the current flag. Tapping an answered flag does nothing.
- **Right answer** (same normalization and aliases as before): the flag turns answered and the current flag moves to the next unanswered flag after it in grid order, wrapping to the start.
- **Wrong answer**: one error, the field clears, "Errado, tente de novo" shows, the flag stays current and gets the red mark. The correct name is still revealed only at the end.
- "Puladas (N)" is removed; tapping a flag replaces it.
- **Pular** (added at the operator's request on 2026-10-07): the current flag moves to the next unanswered flag after it in grid order, wrapping; no error is counted, the field clears and the error message hides. On the last unanswered flag it stays put.
- The quiz ends when every flag is answered, or on "Encerrar".

## Result screen addition

When the quiz was ended early, the result screen lists the flags left unanswered as "Bandeiras sem resposta (N)", each with its name and badge, in the same cards as the wrong flags (added at the operator's request on 2026-10-07). A flag missed and never answered appears in both lists.

## Unchanged

Score (right − errors), the timer, best score and best time per continent and level (including Mundo), the result screen with the badge on revealed names, and storage keys.

## Testing

- Engine: selecting a flag makes it current; selecting an answered flag is rejected; a right answer advances to the next unanswered flag in order with wrap-around; a wrong answer keeps the flag current and records the miss; the quiz finishes when all are answered.
- UI, in the browser: the grid at 390px and desktop for a 9-flag level and for Mundo Geral (248), tapping a flag, the answered state with name, the red mark, focus staying in the field, "Encerrar".
