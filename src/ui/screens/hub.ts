import { saveContinent } from '../../continentChoice';
import { countries } from '../../data/countries';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { hasMedal, loadMedals, type Medals } from '../../progress';
import { isCompleted, loadQuizRecords, quizRecord, type QuizRecord, type QuizRecords } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_FROM, CONTINENT_KEYS, CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';

export function renderHub(root: HTMLElement, navigate: Navigate, initial: ContinentKey): void {
  const medals = loadMedals(localStorage);
  const records = loadQuizRecords(localStorage);
  const completedIn = (continent: ContinentKey) => DIFFICULTIES.filter((d) => isCompleted(quizRecord(records, continent, d))).length;
  const completed = CONTINENT_KEYS.reduce((sum, continent) => sum + completedIn(continent), 0);
  const levels = el('div', { className: 'levels' });

  const select = (continent: ContinentKey) => {
    saveContinent(localStorage, continent);
    for (const [key, tab] of tabs) {
      const selected = key === continent;
      tab.classList.toggle('on', selected);
      tab.setAttribute('aria-pressed', String(selected));
    }
    tabs.get(continent)!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    levels.replaceChildren(
      ...DIFFICULTIES.map((difficulty) => levelCard(navigate, continent, difficulty, medals, records)),
      el('button', { className: 'see-all', type: 'button', onclick: () => navigate({ name: 'flagTable', continent }) }, [
        `Ver as ${poolFor(countries, continent, 'general').length} bandeiras ${CONTINENT_FROM[continent]} →`,
      ]),
    );
  };

  const tabs = new Map(
    CONTINENT_KEYS.map((continent) => [
      continent,
      el('button', { className: 'tab', type: 'button', onclick: () => select(continent) }, [
        CONTINENT_LABEL[continent],
        ' ',
        el('small', {}, [`${completedIn(continent)}/${DIFFICULTIES.length}`]),
      ]),
    ]),
  );

  root.append(
    el('main', { className: 'screen hub' }, [
      el('header', { className: 'hub-header' }, [
        el('h1', {}, ['🌍 Bandeiras']),
        el('span', { className: 'pill' }, [`${completed}/${CONTINENT_KEYS.length * DIFFICULTIES.length} quizzes`]),
      ]),
      el('nav', { className: 'tabs' }, [...tabs.values()]),
      levels,
    ]),
  );
  select(initial);
}

function levelCard(navigate: Navigate, continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): HTMLElement {
  const pool = poolFor(countries, continent, difficulty);
  return el('section', { className: 'card level-card' }, [
    el('div', { className: 'level-head' }, [
      el('h2', {}, [DIFFICULTY_LABEL[difficulty]]),
      el('span', { className: 'meta' }, [`${pool.length} bandeiras`]),
      el('span', { className: 'thumbs' }, pool.slice(0, 3).map((country) => flagImg(country))),
    ]),
    el('div', { className: 'tags' }, [
      hasMedal(medals, continent, difficulty) ? tag('🏅 Medalha', true) : tag(`🏅 meta ${goalFor(difficulty, pool.length)}`, false),
      quizTag(quizRecord(records, continent, difficulty)),
    ]),
    el('div', { className: 'level-actions' }, [
      el('button', { className: 'primary', type: 'button', onclick: () => navigate({ name: 'game', continent, difficulty }) }, ['Aprender']),
      el('button', { className: 'outline', type: 'button', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Quiz']),
    ]),
  ]);
}

function quizTag(record: QuizRecord): HTMLSpanElement {
  if (isCompleted(record)) return tag(record.bestTimeMs === undefined ? '✓ Quiz' : `✓ Quiz ${formatTime(record.bestTimeMs)}`, true);
  return tag(record.bestScore === undefined ? 'Quiz —' : `Quiz ${record.bestScore} pts`, false);
}

function tag(text: string, earned: boolean): HTMLSpanElement {
  return el('span', { className: earned ? 'tag ok' : 'tag' }, [text]);
}
