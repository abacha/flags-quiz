# Flags Quiz — Quiz mode design

Date: 2026-10-06
Status: approved

## Goal

Quiz mode tests recall under time: one flag at a time, the player types its name or skips it, and the app keeps the best score and the best time per level.
It complements Learn mode, which teaches with mixed formats and lives.

Success means a player can pick a continent and a level, go through every flag of the level by typing names, come back to skipped flags, see a running timer, and find their best score and best time on the level screen afterwards.

## Scope

In scope:

- Quiz mode for Africa, on the same four levels as Learn (Fácil, Médio, Difícil, Geral) and the same pools.
- Typing the name, skipping, returning to skipped flags, ending early.
- A timer on screen.
- Best score and best time per continent and level, kept in the browser.
- A result screen with the score, the time, any new record, and the flags answered wrong with their names.

Out of scope:

- Other answer formats (choices, pairs, crops) in Quiz.
- Hints, lives, a time limit.

## Flow

- The home screen enables Quiz. Quiz uses the same continent and level screens as Learn; in Quiz the level screen shows each level's best score and best time instead of the medal and goal.
- A quiz asks every country of the level's pool once, in random order.
- The screen shows one flag, a text field, "Responder", "Pular" and "Encerrar", plus the timer, the score, the number of flags answered against the pool size, and a "Puladas (N)" button when at least one flag is skipped.
- **Right answer** (same normalization and aliases as Learn): the flag counts as answered and the next one appears.
- **Wrong answer**: one error is recorded, the field clears, a short "Errado, tente de novo" shows, and the same flag stays. The correct name is not revealed until the end.
- **Pular**: the flag goes to the skipped list and the next one appears.
- **Puladas (N)**: the next flag shown is the oldest skipped one; skipping it again sends it to the back of the skipped list.
- When no unseen flag is left, skipped flags come back on their own, oldest first.
- The quiz ends when every flag is answered, or when the player taps "Encerrar".

## Score, time and records

- **Score** = right answers − errors. It can go negative.
- **Time** runs from the first flag shown to the end of the quiz, shown as mm:ss and updated every second.
- **Best score** per continent and level: updated whenever a quiz ends, finished or ended early, with a higher score.
- **Best time** per continent and level: updated only when a quiz is finished with every flag answered and zero errors, with a lower time.
- Records live in `localStorage` under the key `flags-quiz:quiz-records`, as `continent → level → { bestScore?, bestTimeMs? }`.

## Result screen

- Score, time, and "Novo recorde!" next to whichever record the quiz beat.
- When the quiz was ended early, the number of flags left unanswered.
- The flags answered wrong at least once, each with its correct name.
- "Jogar de novo" and "Voltar".

## Architecture

```
src/engine/quiz.ts       Quiz state: queue, skipped list, answered, errors, score; DOM-free
src/quizRecords.ts       best score and best time per continent and level over localStorage
src/ui/screens/quiz.ts   quiz screen with the timer
src/ui/screens/quizResult.ts
```

The continent and level screens take the mode (`learn` or `quiz`) and route to the matching game screen. The engine reuses `poolFor` and the name normalization from `answer.ts`; the timer lives in the UI and hands the elapsed time to the result.

## Testing

Vitest covers the engine and the records:

- every pool country is asked once; skip moves a flag to the skipped list; skipped flags return when the queue empties and on demand, oldest first;
- right answers advance, wrong answers count an error and keep the flag;
- score arithmetic, including negative scores;
- ending early leaves unanswered flags counted;
- best score updates on any higher score; best time only for a finished quiz with zero errors and a lower time.

The UI is checked in the browser.
