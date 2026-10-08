# Flags Quiz — Progress screen design

Date: 2026-10-08
Status: implemented

## Goal

A "Progresso" screen, reached from Início, shows how many quizzes the player has completed per continent.
Progress is counted per quiz, one per level: Fácil, Médio, Difícil and Geral of each continent and of Mundo, 24 in total.

## Completion rule

- A level counts as completed once a quiz on it ends with every flag answered, errors included.
- A quiz ended early with "Encerrar" never completes a level, and never removes a completion already earned.
- The mark is stored on the level's quiz record as `completed`.
- A record saved before the mark existed counts as completed when it holds a best time, since a best time is only saved for a quiz finished with no errors. Quizzes finished with errors before 2026-10-08 left no trace and have to be played again.

## Screen

- Top: "N/24 quizzes concluídos".
- One block per continent, in the Início order (Mundo first): the name, "x/4", a bar, and the four levels, each showing "✓" plus the best time when there is one, or "—" when not completed.
- "Voltar" returns to Início.

## Testing

- Records: finishing marks the level completed, errors included; an early end does not; a legacy record with a best time counts.
- Screen: the total, the per-continent count and bar, the level lines, and "Voltar", in a DOM test; the layout checked at 390px in the browser.
