# Flags Quiz — UI/UX redesign

Date: 2026-10-08
Status: implemented

## Goal

The first version works, but moving around takes too many screens, progress lives far from the games, and the look is plain.
This redesign replaces the screen chain with one hub, gives every game a thin top bar that leads straight back, turns results into a clear next step, and restyles the whole app in a "game" look with a single blue accent.

Success means a player opens the app, switches continent with one tap, sees every level's medal and quiz status right there, starts a game, and from any game or result is one tap from the hub or the next level.
No game rule, scoring, storage key or question format changes.

## Navigation

- The hub replaces Início, the continent screen and Progresso; those three screens are removed.
- Screens: hub, Learn game, Learn result, Quiz, Quiz result, flag table.
- The hub's continent is remembered across visits in local storage (`flags-quiz:continent`); the first visit opens on Mundo.
- Every "back" lands on the hub with the same continent selected: the game's ✕ (Learn) leaves to the hub, the flag table's back leaves to the hub, and a result's "Voltar ao início" leaves to the hub.
- Quiz's ✕ ends the quiz and opens its result, as "Encerrar" does today.
- The Learn keyboard shortcuts and the multi-click guard stay as they are.

## Device back

Added at the operator's request on 2026-10-08, once the app was installed as a PWA.
The phone's back button does what each screen's own back does: the flag table closes an open flag first and then returns to the hub, Learn leaves to the hub, Quiz asks "Encerrar o quiz?" and ends the quiz only when confirmed, a result returns to the hub, and on the hub it closes the app.
When the keyboard opens, the page resizes to the visible area (`interactive-widget=resizes-content`), so the quiz keeps its top bar and grid on screen; on short viewports the dock's large flag shrinks.

## Hub

- Header bar in the accent color: "🌍 Bandeiras" and a pill with the total "N/24 quizzes" (completed quizzes, same rule as the progress screen spec).
- Continent tabs below the header, one per continent in the current order (Mundo, África, Américas, Ásia, Europa, Oceania), each with its "x/4" completed quizzes.
  The tabs scroll sideways on a phone; the selected tab is filled.
  Switching tab re-renders the levels in place, with no screen change.
- One card per level (Fácil, Médio, Difícil, Geral):
  - the level name, its flag count, and the first three flags of its pool as small thumbnails;
  - two status tags: the medal ("🏅 Medalha" when earned, else grey "🏅 meta N") and the quiz ("✓ Quiz mm:ss" when completed with a best time, "✓ Quiz" when completed without one, grey "Quiz N pts" with a best score and no completion, grey "Quiz —" otherwise);
  - two buttons: "Aprender" (filled) and "Quiz" (outlined).
- Below the cards, "Ver as N bandeiras de <continente> →" opens the flag table.

## Games

- A thin top bar replaces "Sair", "Encerrar" and the old HUD: a round ✕ button, the "<continente> · <nível>" label, the counters, and a progress bar under it.
  - Learn: lives as ♥, "correct/goal", bar = correct ÷ goal.
  - Quiz: timer, score, "answered/N", bar = answered ÷ N.
- The bodies (question formats, quiz grid and dock, Pular) keep their behavior and get the new style.

## Results

- A title ("🎉 Quiz concluído!", "🏅 Medalha conquistada!", or the current not-won text), the "<continente> · <nível>" line, and the numbers as stat blocks (Quiz: points, time, errors; Learn: correct of goal).
- New-record lines stay.
- Buttons, in order: "Próximo nível: <nível> →" (filled; Fácil → Médio → Difícil → Geral, absent after Geral), "Jogar de novo" (outlined, filled when there is no next level), "Voltar ao início" (link).
- The flag lists (missed, unanswered, review) stay below, every flag with its name and badge.

## Visual style

- Single accent blue, game look: rounded corners (16px cards, 14px buttons), bold weights, and "pressable" buttons with a 4px darker bottom shadow that sinks on press.
- Light tokens: background #f2f6fb, surface #ffffff, text #1b2840, muted #7a8699, accent #2f6fde, accent-dark #1f4fa8, accent-soft #e0eafb, success #1f7a48 on #dff3e7, wrong stays red.
- Dark mode keeps working through `prefers-color-scheme`, with a blue-tinted dark set of the same tokens.
- The hub and results are capped near 720px wide; the flag table and the quiz grid keep their wide layouts on desktop.

## Text and layout rules

- Single-line controls never wrap: buttons, tabs, tags, pills, the answer field's placeholder and the top bar.
  Labels are sized and worded to fit at 360px; anything that still cannot fit truncates with an ellipsis, it never breaks onto a second line.
- Wherever flags appear with names (flag table, result lists, quiz grid, Learn feedback), names have different lengths, so each card keeps its layout fixed: the flag sits in a fixed 4:3 box, centered and contained; the name starts at the same height in every card and wraps to at most two lines; the badge sits on its own line below the name.
  Cards in the same row line up regardless of name length.

## Testing

- Hub (DOM): tabs with x/4 and the remembered continent; switching tabs re-renders in place; level tags for each state; the flag-table link; the header total.
- Navigation: every back path lands on the hub with the same continent; Quiz ✕ opens the result; "Próximo nível" opens the next level's same mode and is absent after Geral.
- Layout rules: a CSS-level test that single-line controls use `white-space: nowrap`, plus browser screenshots at 360px, 390px and 1440px of the hub, a Learn question, the quiz grid, both results and the flag table, checking no control wraps and flag cards line up.
