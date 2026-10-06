import { countries, similarGroups, type Continent } from '../../data/countries';
import { LEVEL_RULES, poolFor, type Difficulty } from '../../engine/pool';
import { Round, STARTING_LIVES } from '../../engine/round';
import { awardMedal } from '../../progress';
import { el } from '../dom';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { renderQuestion } from '../questions/render';

export function renderGame(root: HTMLElement, navigate: Navigate, continent: Continent, difficulty: Difficulty): void {
  const rules = LEVEL_RULES[difficulty];
  const round = new Round(
    {
      pool: poolFor(countries, continent, difficulty),
      world: countries,
      similarGroups,
      similarDistractors: rules.similarDistractors,
    },
    rules,
    Math.random,
  );
  const hud = el('header', { className: 'hud' });
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

  const exit = el('button', { className: 'link', onclick: () => leave({ name: 'difficulty', continent }) }, ['Sair']);
  root.append(el('main', { className: 'screen' }, [exit, hud, stage]));

  const updateHud = () =>
    hud.replaceChildren(
      el('span', {}, ['❤️'.repeat(round.lives) + '🖤'.repeat(STARTING_LIVES - round.lives)]),
      el('span', {}, [`${round.correct}/${round.correctToWin}`]),
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
