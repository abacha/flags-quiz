import { MAP_ALL } from '../../data/maps';
import { capitalContext, CAPITAL_LADDER } from '../../engine/capitalFormats';
import { LadderRound } from '../../engine/ladderRound';
import type { ContinentKey, Difficulty } from '../../engine/pool';
import { awardCapitalMedal } from '../../capitalRecords';
import { onBack } from '../backButton';
import { celebrateAnswer } from '../celebrate';
import { outOfLivesSheet } from '../outOfLives';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { capitalSolution } from '../questions/capitalQuestions';
import { renderQuestion } from '../questions/render';
import { hearts, streakCounter, topBar } from '../topbar';

export function renderCapitalGame(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const round = new LadderRound(capitalContext(continent, difficulty), 0, Math.random, CAPITAL_LADDER);
  const scope = { continent, level: MAP_ALL };
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

  const exit = () => leave({ name: 'hub', continent });
  const bar = topBar(`Capitais · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, exit);
  onBack(exit);
  root.append(el('main', { className: 'screen' }, [bar.element, stage]));

  let streak = 0;
  const updateHud = (lifeLost = false) =>
    bar.update(
      [hearts(round.lives, lifeLost), ...streakCounter(streak), el('span', {}, [`${round.done}/${round.size}`])],
      round.done / round.size,
    );

  const finish = () => {
    const won = round.status === 'won';
    const medal = won ? round.medal : null;
    if (medal) awardCapitalMedal(localStorage, continent, difficulty, medal);
    leave({ name: 'capitalResult', continent, difficulty, won, medal, done: round.done, correct: round.correct, answered: round.answered, missed: round.missed });
  };

  const next = (feedback: HTMLElement) => {
    if (round.status === 'playing') return ask();
    if (round.status === 'won') return finish();
    const sheet = outOfLivesSheet(() => {
      round.continueWithoutMedal();
      ask();
    }, finish);
    feedback.replaceWith(sheet);
    sheet.querySelector('button')?.focus();
  };

  const ask = () => {
    const question = round.nextQuestion();
    const questionEl = renderQuestion(question, (answer) => {
      const lives = round.lives;
      const result = round.answer(answer);
      if (result.typos.length > 0) return result.typos;
      questionEl.inert = true;
      streak = result.correct ? streak + 1 : 0;
      updateHud(round.lives < lives);
      const feedback = renderFeedback(question, result, () => next(feedback), capitalSolution(question), true);
      stage.append(feedback);
      celebrateAnswer(questionEl, feedback, result, streak);
      feedback.querySelector('button')?.focus();
      return [];
    }, scope);
    currentQuestion = questionEl;
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
