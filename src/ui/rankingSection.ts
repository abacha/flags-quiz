import {
  NicknameLengthError,
  NicknameTakenError,
  claimNickname,
  fetchLeaderboard,
  flushQueue,
  loadPlayer,
  queueRun,
  type RankedRun,
  type Standing,
} from '../ranking';
import { el } from './dom';
import { formatTime } from './time';

const TOP = 10;
const OFFLINE = 'Ranking indisponível sem conexão';

function standings(rows: Standing[]): HTMLElement {
  if (rows.length === 0) return el('p', { className: 'detail' }, ['Ninguém no ranking ainda']);
  const line = (row: Standing) =>
    el('li', { className: row.mine ? 'me' : '' }, [`${row.rank}. ${row.nickname} · ${row.score} pts · ${formatTime(row.timeMs)}`]);
  return el('ol', {}, [
    ...rows.slice(0, TOP).map(line),
    ...(rows.length > TOP ? [el('li', { className: 'gap' }, ['⋯']), ...rows.slice(TOP).map(line)] : []),
  ]);
}

function refusal(error: unknown): string {
  if (error instanceof NicknameTakenError) return 'Esse apelido já existe';
  if (error instanceof NicknameLengthError) return 'Use de 2 a 16 caracteres';
  return OFFLINE;
}

export function rankingSection(run: RankedRun): HTMLElement {
  queueRun(localStorage, run);
  const body = el('div', { className: 'ranking-body' }, ['Carregando ranking…']);

  const nicknameForm = () => {
    const input = el('input', { type: 'text', placeholder: 'Seu apelido', maxLength: 16 });
    const error = el('p', { className: 'ranking-error', hidden: true });
    const enter = el('button', { className: 'primary', type: 'submit' }, ['Entrar']);
    const form = el('form', { className: 'type-form' }, [
      el('p', {}, ['Escolha um apelido para entrar no ranking']),
      input,
      enter,
      error,
    ]);
    form.onsubmit = async (event) => {
      event.preventDefault();
      enter.disabled = true;
      try {
        await claimNickname(localStorage, input.value);
      } catch (refused) {
        error.textContent = refusal(refused);
        error.hidden = false;
        enter.disabled = false;
        return;
      }
      await show();
    };
    return form;
  };

  const show = async () => {
    await flushQueue(localStorage).catch(() => {});
    try {
      const player = loadPlayer(localStorage);
      const rows = await fetchLeaderboard(run, player);
      body.replaceChildren(standings(rows), ...(player ? [] : [nicknameForm()]));
    } catch {
      body.replaceChildren(el('p', { className: 'detail' }, [OFFLINE]));
    }
  };

  void show();
  return el('section', { className: 'ranking' }, [el('h2', {}, ['Ranking']), body]);
}
