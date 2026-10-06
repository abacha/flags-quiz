import { countries, similarGroups, type Continent } from '../../data/countries';
import { LEVEL_RULES, poolFor, type Difficulty } from '../../engine/pool';
import { CORRECT_TO_WIN, Round, STARTING_LIVES } from '../../engine/round';
import { awardMedal } from '../../progress';
import { el } from '../dom';
import type { Navigate } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { renderQuestion } from '../questions/render';

export function renderGame(root: HTMLElement, navigate: Navigate, continent: Continent, difficulty: Difficulty): void {
  const round = new Round(
    {
      pool: poolFor(countries, continent, difficulty),
      world: countries,
      similarGroups,
      similarDistractors: LEVEL_RULES[difficulty].similarDistractors,
    },
    Math.random,
  );
  const hud = el('header', { className: 'hud' });
  const stage = el('section', { className: 'stage' });
  root.append(el('main', { className: 'screen' }, [hud, stage]));

  const updateHud = () =>
    hud.replaceChildren(
      el('span', {}, ['❤️'.repeat(round.lives) + '🖤'.repeat(STARTING_LIVES - round.lives)]),
      el('span', {}, [`${round.correct}/${CORRECT_TO_WIN}`]),
    );

  const finish = () => {
    const won = round.status === 'won';
    if (won) awardMedal(localStorage, continent, difficulty);
    navigate({ name: 'result', continent, difficulty, won, correct: round.correct, missed: round.missed });
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
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
