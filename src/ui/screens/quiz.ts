import { countries } from '../../data/countries';
import { poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { Quiz } from '../../engine/quiz';
import { saveQuizOutcome } from '../../quizRecords';
import { el } from '../dom';
import type { Navigate } from '../navigation';
import { flagFigure } from '../questions/choices';
import { formatTime } from '../time';

export function renderQuiz(root: HTMLElement, navigate: Navigate, continent: ContinentKey, difficulty: Difficulty): void {
  const quiz = new Quiz(poolFor(countries, continent, difficulty), Math.random);
  const startedAt = performance.now();
  const elapsed = () => performance.now() - startedAt;

  const timer = el('span', {}, [formatTime(0)]);
  const interval = window.setInterval(() => {
    timer.textContent = formatTime(elapsed());
  }, 1000);
  const hud = el('header', { className: 'hud' });
  const stage = el('section', { className: 'stage' });
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
  const exit = el('button', { className: 'link', onclick: finish }, ['Encerrar']);
  root.append(el('main', { className: 'screen' }, [exit, hud, stage]));

  const updateHud = () =>
    hud.replaceChildren(timer, el('span', {}, [`${quiz.score} pts`]), el('span', {}, [`${quiz.answeredCount}/${quiz.total}`]));

  const show = (message: string | null) => {
    updateHud();
    if (quiz.status !== 'playing') return finish();
    const input = el('input', {
      type: 'text',
      required: true,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: false,
      placeholder: 'Nome do país',
    });
    const form = el('form', { className: 'type-form' }, [input, el('button', { className: 'primary', type: 'submit' }, ['Responder'])]);
    form.onsubmit = (event) => {
      event.preventDefault();
      if (input.value.trim() === '') {
        input.value = '';
        return;
      }
      show(quiz.answer(input.value) ? null : 'Errado, tente de novo');
    };
    const skip = el('button', { className: 'big', type: 'button', onclick: () => (quiz.skip(), show(null)) }, ['Pular']);
    skip.dataset.rapidTaps = '';
    const reopen = el('button', { className: 'big', type: 'button', onclick: () => (quiz.openSkipped(), show(null)) }, [
      `Puladas (${quiz.skippedCount})`,
    ]);
    reopen.dataset.rapidTaps = '';
    // Both buttons always take a grid cell, so "Pular" never shifts when the second
    // one appears; when there is nothing skipped yet it is only hidden, not removed.
    if (quiz.skippedCount === 0) {
      reopen.disabled = true;
      reopen.style.visibility = 'hidden';
    }
    stage.replaceChildren(
      el('div', { className: 'question' }, [
        flagFigure(quiz.current),
        ...(message ? [el('p', { className: 'quiz-message' }, [message])] : []),
        form,
        el('div', { className: 'quiz-actions' }, [skip, reopen]),
      ]),
    );
    input.focus();
  };

  show(null);
}
