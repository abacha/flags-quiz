import { mapLevelLabel, mapRegionOf, type MapLevel } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { LadderRound } from '../../engine/ladderRound';
import { ladderStart, mapContext } from '../../engine/mapFormats';
import { mapLearnSize, practiceSample } from '../../engine/practice';
import { awardMapMedal, loadMapMedals } from '../../mapRecords';
import { medalOf } from '../../progress';
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
  const context = mapContext(continent, level);
  const medals = loadMapMedals(localStorage);
  const regionMedal = (iso2: string) => {
    const region = mapRegionOf(continent, iso2);
    return region === undefined ? undefined : medalOf(medals, continent, region);
  };
  const targets = practiceSample(context.pool, (c) => regionMedal(c.iso2), mapLearnSize(level, context.pool.length), Math.random);
  const round = new LadderRound(context, ladderStart(level), Math.random, targets);
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
