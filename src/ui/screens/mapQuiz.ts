import type { Country } from '../../data/countries';
import { mapPool } from '../../data/maps';
import type { ContinentKey, Difficulty } from '../../engine/pool';
import type { Quiz } from '../../engine/quiz';
import { saveMapQuizOutcome } from '../../mapRecords';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import { renderMap } from '../map/map';
import type { Navigate } from '../navigation';
import { runQuiz, type QuizBoard } from './quiz';

export function renderMapQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const pool = mapPool(continent, difficulty);
  runQuiz(root, navigate, {
    pool,
    title: `Mapa · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`,
    board: (quiz, pick) => mapBoard(continent, pool, quiz, pick),
    save: (store, outcome) => saveMapQuizOutcome(store, continent, difficulty, outcome),
    resultScreen: (result) => ({ name: 'mapQuizResult', continent, difficulty, ...result }),
  });
}

function mapBoard(continent: ContinentKey, pool: Country[], quiz: Quiz, pick: (country: Country) => void): QuizBoard {
  const view = renderMap(continent, (country) => {
    if (pool.includes(country) && quiz.stateOf(country.iso2) !== 'answered') pick(country);
  });
  const painted = new Map<string, string>();
  let framed: Country | undefined;
  return {
    element: view.element,
    paint() {
      for (const country of quiz.flags) {
        const state = quiz.stateOf(country.iso2);
        const look = country === quiz.current ? 'highlight' : state === 'answered' ? 'answered' : state === 'missed' ? 'missed' : 'idle';
        if (painted.get(country.iso2) === look) continue;
        painted.set(country.iso2, look);
        view.paint(country.iso2, look, state === 'answered' ? country.name : undefined);
      }
      if (quiz.current === framed) return;
      view.focus([quiz.current.iso2], { animate: framed !== undefined });
      framed = quiz.current;
    },
    reveal() {},
  };
}
