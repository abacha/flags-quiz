import { LEVEL_RULES, goalFor, type ContinentKey } from '../../engine/pool';
import { MAP_FORMATS, mapContext } from '../../engine/mapFormats';
import { mapPool } from '../../data/maps';
import { Round, STARTING_LIVES } from '../../engine/round';
import { awardMapMedal } from '../../mapRecords';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { mapSolution, type MapQuestion } from '../questions/mapQuestions';
import { renderQuestion } from '../questions/render';
import { topBar } from '../topbar';

export function renderMapGame(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const round = new Round(
    mapContext(continent),
    { correctToWin: goalFor('general', mapPool(continent).length), recallWeight: LEVEL_RULES.general.recallWeight },
    Math.random,
    MAP_FORMATS,
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
  const bar = topBar(`Mapa · ${CONTINENT_LABEL[continent]}`, exit);
  onBack(exit);
  root.append(el('main', { className: 'screen' }, [bar.element, stage]));

  const updateHud = () =>
    bar.update(
      [
        el(
          'span',
          { className: 'lives' },
          Array.from({ length: STARTING_LIVES }, (_, life) => el('span', { className: life < round.lives ? 'heart' : 'heart lost' }, ['♥'])),
        ),
        el('span', {}, [`${round.correct}/${round.correctToWin}`]),
      ],
      round.correct / round.correctToWin,
    );

  const finish = () => {
    const won = round.status === 'won';
    if (won) awardMapMedal(localStorage, continent);
    leave({ name: 'mapResult', continent, won, correct: round.correct, missed: round.missed });
  };

  const ask = () => {
    const question = round.nextQuestion();
    const questionEl = renderQuestion(
      question,
      (answer) => {
        questionEl.inert = true;
        const result = round.answer(answer);
        updateHud();
        const feedback = renderFeedback(
          question,
          result,
          () => (round.status === 'playing' ? ask() : finish()),
          result.correct ? undefined : mapSolution(question as MapQuestion, continent),
        );
        stage.append(feedback);
        feedback.querySelector('button')?.focus();
      },
      continent,
    );
    currentQuestion = questionEl;
    stage.replaceChildren(questionEl);
    window.scrollTo({ top: 0 });
  };

  updateHud();
  ask();
}
