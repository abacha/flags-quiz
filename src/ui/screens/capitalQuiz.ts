import { capitalLabel, capitalPool } from '../../data/capitals';
import { judgeTypedCapital } from '../../engine/answer';
import type { ContinentKey, Difficulty } from '../../engine/pool';
import { saveCapitalQuizOutcome } from '../../capitalRecords';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { countryFigure } from '../questions/capitalQuestions';
import { quizGrid, runQuiz } from './quiz';

export function renderCapitalQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  runQuiz(root, navigate, {
    pool: capitalPool(continent, difficulty),
    judge: judgeTypedCapital,
    placeholder: 'Capital',
    title: `Capitais · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`,
    figure: countryFigure,
    board: quizGrid(
      (country) => country.name,
      (country, state) => (state === 'answered' ? capitalLabel(country) : ''),
    ),
    save: (store, outcome) => saveCapitalQuizOutcome(store, continent, difficulty, outcome),
    resultScreen: (result) => ({ name: 'capitalQuizResult', continent, difficulty, ...result }),
  });
}
