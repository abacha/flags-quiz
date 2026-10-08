import { countries, type Country } from '../../data/countries';
import { poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { Quiz } from '../../engine/quiz';
import { saveQuizOutcome } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';
import { topBar } from '../topbar';

export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const quiz = new Quiz(poolFor(countries, continent, difficulty), Math.random);
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
    const newRecords = saveQuizOutcome(localStorage, continent, difficulty, { score: quiz.score, timeMs, finished, errors: quiz.errors });
    navigate({
      name: 'quizResult',
      continent,
      difficulty,
      score: quiz.score,
      timeMs,
      finished,
      unanswered: quiz.unanswered,
      missed: quiz.missed,
      newRecords,
    });
  };
  const bar = topBar(`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`, finish);

  const figure = el('div', { className: 'figure' });
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

  const cells = new Map<Country, { cell: HTMLButtonElement; name: HTMLSpanElement }>();

  const paint = () => {
    bar.update([timer, el('span', {}, [`${quiz.score} pts`]), el('span', {}, [`${quiz.answeredCount}/${quiz.total}`])], quiz.answeredCount / quiz.total);
    for (const [country, { cell, name }] of cells) {
      const state = quiz.stateOf(country.iso2);
      cell.className = `quiz-cell ${state}`;
      cell.classList.toggle('current', country === quiz.current);
      cell.disabled = state === 'answered';
      name.textContent = state === 'answered' ? country.name : '';
    }
    figure.replaceChildren(flagImg(quiz.current));
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

  const grid = el(
    'div',
    { className: 'quiz-grid' },
    quiz.flags.map((country) => {
      const name = el('span', { className: 'quiz-name' });
      const cell = el('button', { className: 'quiz-cell', type: 'button', onclick: () => pick(country) }, [
        el('span', { className: 'quiz-thumb' }, [flagImg(country, 'flag', 'lazy')]),
        name,
      ]);
      cells.set(country, { cell, name });
      return cell;
    }),
  );

  skip.onclick = () => {
    quiz.skip();
    input.value = '';
    message.hidden = true;
    paint();
    cells.get(quiz.current)!.cell.scrollIntoView({ block: 'nearest' });
    input.focus();
  };

  form.onsubmit = (event) => {
    event.preventDefault();
    if (input.value.trim() === '') {
      input.value = '';
      return;
    }
    const right = quiz.answer(input.value);
    input.value = '';
    if (quiz.status !== 'playing') return finish();
    message.hidden = right;
    paint();
    if (right) cells.get(quiz.current)!.cell.scrollIntoView({ block: 'nearest' });
    input.focus();
  };

  root.append(
    el('main', { className: 'screen quiz-screen' }, [bar.element, grid, el('div', { className: 'quiz-dock' }, [figure, message, form])]),
  );
  paint();
  input.focus();
}
