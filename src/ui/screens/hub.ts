import { loadArea, saveArea, saveContinent, type Area } from '../../continentChoice';
import { countries } from '../../data/countries';
import { mapPool } from '../../data/maps';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import { hasMapMedal, loadMapMedals, loadMapQuizRecords, mapQuizRecord, type MapMedals, type MapQuizRecords } from '../../mapRecords';
import { hasMedal, loadMedals, type Medals } from '../../progress';
import { isCompleted, loadQuizRecords, quizRecord, type QuizRecord, type QuizRecords } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_FROM, CONTINENT_KEYS, CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { formatTime } from '../time';

const AREA_LABEL: Record<Area, string> = { flags: 'Bandeiras', maps: 'Mapas' };

export function renderHub(root: HTMLElement, navigate: Navigate, initial: ContinentKey): void {
  const medals = loadMedals(localStorage);
  const records = loadQuizRecords(localStorage);
  const mapMedals = loadMapMedals(localStorage);
  const mapRecords = loadMapQuizRecords(localStorage);
  const completedIn = (continent: ContinentKey) => DIFFICULTIES.filter((d) => isCompleted(quizRecord(records, continent, d))).length;
  const completed = CONTINENT_KEYS.reduce((sum, continent) => sum + completedIn(continent), 0);
  const mapCompleted = (continent: ContinentKey) => isCompleted(mapQuizRecord(mapRecords, continent));
  const pill = el('span', { className: 'pill' });
  const levels = el('div', { className: 'levels' });
  let area = loadArea(localStorage);
  let continent = initial;

  const press = <K>(buttons: Map<K, HTMLButtonElement>, chosen: K) => {
    for (const [key, button] of buttons) {
      const selected = key === chosen;
      button.classList.toggle('on', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  };

  const tabCount = (key: ContinentKey) => {
    if (area === 'flags') return [' ', el('small', {}, [`${completedIn(key)}/${DIFFICULTIES.length}`])];
    return mapCompleted(key) ? [' ', el('small', {}, ['✓'])] : [];
  };

  const render = () => {
    press(areas, area);
    press(tabs, continent);
    pill.textContent =
      area === 'flags'
        ? `${completed}/${CONTINENT_KEYS.length * DIFFICULTIES.length} quizzes`
        : `${CONTINENT_KEYS.filter(mapCompleted).length}/${CONTINENT_KEYS.length} mapas`;
    for (const [key, tab] of tabs) tab.replaceChildren(CONTINENT_LABEL[key], ...tabCount(key));
    tabs.get(continent)!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (area === 'maps') {
      levels.replaceChildren(mapCard(navigate, continent, mapMedals, mapRecords));
      return;
    }
    levels.replaceChildren(
      ...DIFFICULTIES.map((difficulty) => levelCard(navigate, continent, difficulty, medals, records)),
      el('button', { className: 'see-all', type: 'button', onclick: () => navigate({ name: 'flagTable', continent }) }, [
        `Ver as ${poolFor(countries, continent, 'general').length} bandeiras ${CONTINENT_FROM[continent]} →`,
      ]),
    );
  };

  const chooseArea = (key: Area) => {
    area = key;
    saveArea(localStorage, key);
    render();
  };

  const chooseContinent = (key: ContinentKey) => {
    continent = key;
    saveContinent(localStorage, key);
    render();
  };

  const areas = new Map(
    (['flags', 'maps'] as const).map((key) => [
      key,
      el('button', { type: 'button', onclick: () => chooseArea(key) }, [AREA_LABEL[key]]),
    ]),
  );

  const tabs = new Map(
    CONTINENT_KEYS.map((key) => [
      key,
      el('button', { className: 'tab', type: 'button', onclick: () => chooseContinent(key) }),
    ]),
  );

  root.append(
    el('main', { className: 'screen hub' }, [
      el('header', { className: 'hub-header' }, [el('h1', {}, ['🌍 Bandeiras']), pill]),
      el('div', { className: 'area-selector', role: 'group' }, [...areas.values()]),
      el('nav', { className: 'tabs' }, [...tabs.values()]),
      levels,
    ]),
  );
  saveContinent(localStorage, continent);
  render();
}

function mapCard(navigate: Navigate, continent: ContinentKey, medals: MapMedals, records: MapQuizRecords): HTMLElement {
  const count = mapPool(continent).length;
  return el('section', { className: 'card level-card' }, [
    el('div', { className: 'level-head' }, [el('h2', {}, [CONTINENT_LABEL[continent]]), el('span', { className: 'meta' }, [`${count} países`])]),
    el('div', { className: 'tags' }, [
      hasMapMedal(medals, continent) ? tag('🏅 Medalha', true) : tag(`🏅 meta ${goalFor('general', count)}`, false),
      quizTag(mapQuizRecord(records, continent)),
    ]),
    el('div', { className: 'level-actions' }, [
      el('button', { className: 'primary', type: 'button', onclick: () => navigate({ name: 'mapGame', continent }) }, ['Aprender']),
      el('button', { className: 'outline', type: 'button', onclick: () => navigate({ name: 'mapQuiz', continent }) }, ['Quiz']),
    ]),
  ]);
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
