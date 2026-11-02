import { capitalContext, CAPITAL_FORMATS } from '../../engine/capitalFormats';
import { LEVEL_RULES, TIER_LEVEL, goalFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { learnPoolSize, practiceSample } from '../../engine/practice';
import { medalOf } from '../../progress';
import { Round } from '../../engine/round';
import { awardCapitalMedal, loadCapitalMedals } from '../../capitalRecords';
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
  const rules = LEVEL_RULES[difficulty];
  const levelContext = capitalContext(continent, difficulty);
  const medals = loadCapitalMedals(localStorage);
  const pool = practiceSample(
    levelContext.pool,
    (c) => medalOf(medals, continent, TIER_LEVEL[c.tier]),
    learnPoolSize(difficulty, levelContext.pool.length),
    Math.random,
  );
  const context = { ...levelContext, pool };
  const round = new Round(
    context,
    { correctToWin: goalFor(difficulty, context.pool.length), recallWeight: rules.recallWeight },
    Math.random,
    CAPITAL_FORMATS,
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
  const bar = topBar(`Capitais · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, exit);
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
    if (medal) awardCapitalMedal(localStorage, continent, difficulty, medal);
    leave({ name: 'capitalResult', continent, difficulty, won, medal, correct: round.correct, missed: round.missed });
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
    });
    currentQuestion = questionEl;
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
