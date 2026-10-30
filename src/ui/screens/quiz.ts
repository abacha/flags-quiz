import { countries, type Country } from '../../data/countries';
import { poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { Quiz, type Nearest } from '../../engine/quiz';
import { saveQuizOutcome, type NewRecords, type QuizOutcome, type RecordStore } from '../../quizRecords';
import { el } from '../dom';
import { onBack } from '../backButton';
import { flagImg } from '../flag';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { formatTime } from '../time';
import { topBar } from '../topbar';

export interface QuizBoard {
  element: HTMLElement;
  paint(quiz: Quiz): void;
  reveal(country: Country): void;
}

export interface QuizResult {
  score: number;
  timeMs: number;
  errors: number;
  finished: boolean;
  unanswered: Country[];
  missed: Country[];
  newRecords: NewRecords;
}

export interface QuizSpec {
  pool: readonly Country[];
  nearest?: Nearest;
  title: string;
  figure?: (country: Country) => HTMLElement;
  board: (quiz: Quiz, pick: (country: Country) => void) => QuizBoard;
  save: (store: RecordStore, outcome: QuizOutcome) => NewRecords;
  resultScreen: (result: QuizResult) => Screen;
}

export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  runQuiz(root, navigate, {
    pool: poolFor(countries, continent, difficulty),
    title: `${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`,
    figure: (country) => flagImg(country),
    board: flagGrid,
    save: (store, outcome) => saveQuizOutcome(store, continent, difficulty, outcome),
    resultScreen: (result) => ({
      name: 'quizResult',
      continent,
      difficulty,
      ...result,
    }),
  });
}

function flagGrid(quiz: Quiz, pick: (country: Country) => void): QuizBoard {
  const cells = new Map<Country, { cell: HTMLButtonElement; name: HTMLSpanElement }>();
  const element = el(
    'div',
    { className: 'quiz-grid' },
    quiz.flags.map((country) => {
      const name = el('span', { className: 'quiz-name' });
      const cell = el(
        'button',
        {
          className: 'quiz-cell',
          type: 'button',
          onclick: () => pick(country),
        },
        [el('span', { className: 'quiz-thumb' }, [flagImg(country, 'flag', 'lazy')]), name],
      );
      cells.set(country, { cell, name });
      return cell;
    }),
  );
  return {
    element,
    paint() {
      for (const [country, { cell, name }] of cells) {
        const state = quiz.stateOf(country.iso2);
        cell.className = `quiz-cell ${state}`;
        cell.classList.toggle('current', country === quiz.current);
        cell.disabled = state === 'answered';
        name.textContent = state === 'answered' ? country.name : '';
      }
    },
    reveal: (country) => cells.get(country)!.cell.scrollIntoView({ block: 'nearest' }),
  };
}

export function runQuiz(root: HTMLElement, navigate: Navigate, spec: QuizSpec): void {
  const quiz = new Quiz(spec.pool, Math.random, spec.nearest);
  const startedAt = performance.now();
  const elapsed = () => performance.now() - startedAt;

  const timer = el('span', {}, [formatTime(0)]);
  const interval = window.setInterval(() => {
    timer.textContent = formatTime(elapsed());
  }, 1000);
  const finish = () => {
    window.clearInterval(interval);
    if (quiz.status === 'playing') quiz.end();
    const timeMs = elapsed();
    const finished = quiz.status === 'finished';
    const newRecords = spec.save(localStorage, {
      score: quiz.score,
      timeMs,
      finished,
      errors: quiz.errors,
    });
    navigate(
      spec.resultScreen({
        score: quiz.score,
        timeMs,
        errors: quiz.errors,
        finished,
        unanswered: quiz.unanswered,
        missed: quiz.missed,
        newRecords,
      }),
    );
  };
  const bar = topBar(spec.title, finish);
  onBack(() => {
    if (window.confirm('Encerrar o quiz?')) finish();
  });

  const figure = spec.figure ? el('div', { className: 'figure' }) : null;
  const message = el('p', { className: 'quiz-message', hidden: true }, ['Errado, tente de novo']);
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: 'Nome',
  });
  const skip = el('button', { className: 'secondary', type: 'button' }, ['Pular']);
  const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder']), skip]);

  const paint = () => {
    bar.update(
      [timer, el('span', {}, [`${quiz.score} pts`]), el('span', {}, [`${quiz.answeredCount}/${quiz.total}`])],
      quiz.answeredCount / quiz.total,
    );
    board.paint(quiz);
    figure?.replaceChildren(spec.figure!(quiz.current));
  };

  const pick = (country: Country) => {
    if (country !== quiz.current) {
      quiz.select(country.iso2);
      input.value = '';
      message.hidden = true;
      paint();
    }
    input.focus();
  };

  const board = spec.board(quiz, pick);

  skip.onclick = () => {
    quiz.skip();
    input.value = '';
    message.hidden = true;
    paint();
    board.reveal(quiz.current);
    input.focus();
  };

  form.onsubmit = (event) => {
    event.preventDefault();
    if (input.value.trim() === '') {
      input.value = '';
      return;
    }
    const verdict = quiz.answer(input.value);
    if (verdict !== 'typo') input.value = '';
    if (quiz.status !== 'playing') return finish();
    message.textContent = verdict === 'typo' ? 'Confira a grafia' : 'Errado, tente de novo';
    message.hidden = verdict === 'right';
    paint();
    if (verdict === 'right') board.reveal(quiz.current);
    input.focus();
  };

  root.append(
    el('main', { className: 'screen quiz-screen' }, [
      bar.element,
      board.element,
      el('div', { className: 'quiz-dock' }, [...(figure ? [figure] : []), message, form]),
    ]),
  );
  paint();
  input.focus();
}
