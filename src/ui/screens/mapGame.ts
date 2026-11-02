import { mapLevelLabel, type MapLevel } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { LadderRound } from '../../engine/ladderRound';
import { mapContext } from '../../engine/mapFormats';
import { awardMapMedal } from '../../mapRecords';
import { onBack } from '../backButton';
import { celebrateAnswer } from '../celebrate';
import { outOfLivesSheet } from '../outOfLives';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { mapSolution, type MapQuestion } from '../questions/mapQuestions';
import { renderQuestion } from '../questions/render';
import { hearts, streakCounter, topBar } from '../topbar';

export function renderMapGame(root: HTMLElement, navigate: Navigate, continent: ContinentKey, level: MapLevel): void {
  const round = new LadderRound(mapContext(continent, level), 0, Math.random);
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
  const bar = topBar(`Mapa · ${CONTINENT_LABEL[continent]} · ${mapLevelLabel(continent, level)}`, exit);
  onBack(exit);
  root.append(el('main', { className: 'screen map-game' }, [bar.element, stage]));

  let streak = 0;
  const updateHud = (lifeLost = false) =>
    bar.update(
      [hearts(round.lives, lifeLost), ...streakCounter(streak), el('span', {}, [`${round.done}/${round.size}`])],
      round.done / round.size,
    );

  const finish = () => {
    const won = round.status === 'won';
    const medal = won ? round.medal : null;
    if (medal) awardMapMedal(localStorage, continent, level, medal);
    leave({ name: 'mapResult', continent, level, won, medal, done: round.done, missed: round.missed });
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
    const questionEl = renderQuestion(
      question,
      (answer) => {
        const lives = round.lives;
        const result = round.answer(answer);
        if (result.typos.length > 0) return result.typos;
        questionEl.inert = true;
        streak = result.correct ? streak + 1 : 0;
        updateHud(round.lives < lives);
        const feedback = renderFeedback(
          question,
          result,
          () => next(feedback),
          result.correct ? undefined : mapSolution(question as MapQuestion, { continent, level }),
        );
        stage.append(feedback);
        celebrateAnswer(questionEl, feedback, result, streak);
        feedback.querySelector('button')?.focus();
        return [];
      },
      { continent, level },
    );
    currentQuestion = questionEl;
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
