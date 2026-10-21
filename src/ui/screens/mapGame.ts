import { LEVEL_RULES, goalFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { MAP_FORMATS, mapContext } from '../../engine/mapFormats';
import { Round, STARTING_LIVES } from '../../engine/round';
import { awardMapMedal } from '../../mapRecords';
import { onBack } from '../backButton';
import { outOfLivesSheet } from '../outOfLives';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { renderFeedback } from '../questions/feedback';
import { pressShortcut } from '../questions/keys';
import { mapSolution, type MapQuestion } from '../questions/mapQuestions';
import { renderQuestion } from '../questions/render';
import { topBar } from '../topbar';

export function renderMapGame(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const context = mapContext(continent, difficulty);
  const round = new Round(
    context,
    { correctToWin: goalFor(difficulty, context.pool.length), recallWeight: LEVEL_RULES[difficulty].recallWeight },
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
  const bar = topBar(`Mapa · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, exit);
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
    const medal = won ? round.medal : null;
    if (medal) awardMapMedal(localStorage, continent, difficulty, medal);
    leave({ name: 'mapResult', continent, difficulty, won, medal, correct: round.correct, missed: round.missed });
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
        questionEl.inert = true;
        const result = round.answer(answer);
        updateHud();
        const feedback = renderFeedback(
          question,
          result,
          () => next(feedback),
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
