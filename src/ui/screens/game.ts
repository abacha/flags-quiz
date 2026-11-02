import { countries, similarGroups, similarNames } from '../../data/countries';
import { LEVEL_RULES, TIER_LEVEL, goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { learnPoolSize, practiceSample } from '../../engine/practice';
import { Round } from '../../engine/round';
import { awardMedal, loadMedals, medalOf } from '../../progress';
import { onBack } from '../backButton';
import { celebrateAnswer } from '../celebrate';
import { outOfLivesSheet } from '../outOfLives';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { renderQuestion } from '../questions/render';
import { hearts, streakCounter, topBar } from '../topbar';

export function renderGame(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const rules = LEVEL_RULES[difficulty];
  const levelPool = poolFor(countries, continent, difficulty);
  const medals = loadMedals(localStorage);
  const pool = practiceSample(levelPool, (c) => medalOf(medals, continent, TIER_LEVEL[c.tier]), learnPoolSize(difficulty, levelPool.length), Math.random);
  const round = new Round(
    { pool, world: countries, similarGroups, similarNames, similarDistractors: rules.similarDistractors },
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

  const exit = () => leave({ name: 'hub', continent });
  const bar = topBar(`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, exit);
  onBack(exit);
  root.append(el('main', { className: 'screen' }, [bar.element, stage]));

  let streak = 0;
  const updateHud = (lifeLost = false) =>
    bar.update(
      [hearts(round.lives, lifeLost), ...streakCounter(streak), el('span', {}, [`${round.correct}/${round.correctToWin}`])],
      round.correct / round.correctToWin,
    );

  const finish = () => {
    const won = round.status === 'won';
    const medal = won ? round.medal : null;
    if (medal) awardMedal(localStorage, continent, difficulty, medal);
    leave({ name: 'result', continent, difficulty, won, medal, correct: round.correct, missed: round.missed });
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
      const feedback = renderFeedback(question, result, () => next(feedback));
      stage.append(feedback);
      celebrateAnswer(questionEl, feedback, result, streak);
      feedback.querySelector('button')?.focus();
      return [];
    });
    currentQuestion = questionEl;
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
