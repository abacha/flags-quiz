import { loadArea, saveArea, saveContinent, type Area } from '../../continentChoice';
import { countries, type Country } from '../../data/countries';
import { capitalPool } from '../../data/capitals';
import { MAP_ALL, mapLevelLabel, mapLevels, mapPool, type MapLevel } from '../../data/maps';
import { mapDifficulty } from '../../engine/mapFormats';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../../engine/pool';
import type { Medal } from '../../engine/round';
import { loadCapitalMedals, loadCapitalQuizRecords } from '../../capitalRecords';
import { loadMapMedals, loadMapQuizRecords } from '../../mapRecords';
import { loadMedals, medalOf, type Medals } from '../../progress';
import { isCompleted, loadQuizRecords, quizRecord, type QuizRecord, type QuizRecords } from '../../quizRecords';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_FROM, CONTINENT_KEYS, CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL, MEDAL_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { formatTime } from '../time';

const AREA_LABEL: Record<Area, string> = { flags: 'Bandeiras', maps: 'Mapas', capitals: 'Capitais' };

export function renderHub(root: HTMLElement, navigate: Navigate, initial: ContinentKey): void {
  const medals = loadMedals(localStorage);
  const records = loadQuizRecords(localStorage);
  const mapMedals = loadMapMedals(localStorage);
  const mapRecords = loadMapQuizRecords(localStorage);
  const capitalMedals = loadCapitalMedals(localStorage);
  const capitalRecords = loadCapitalQuizRecords(localStorage);
  const saved: Record<Area, Saved> = {
    flags: { medals, records },
    maps: { medals: mapMedals, records: mapRecords },
    capitals: { medals: capitalMedals, records: capitalRecords },
  };
  const levelsOf = (continent: ContinentKey): readonly string[] => (area === 'maps' ? mapLevels(continent) : DIFFICULTIES);
  const completedIn = (continent: ContinentKey) => levelsOf(continent).filter((level) => isCompleted(quizRecord(saved[area].records, continent, level))).length;
  const completed = () => CONTINENT_KEYS.reduce((sum, continent) => sum + completedIn(continent), 0);
  const total = () => CONTINENT_KEYS.reduce((sum, continent) => sum + levelsOf(continent).length, 0);
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
    const done = completedIn(key);
    const levelCount = levelsOf(key).length;
    return [' ', el('small', {}, [done === levelCount ? '✓' : `${done}/${levelCount}`])];
  };

  const render = () => {
    press(areas, area);
    press(tabs, continent);
    pill.textContent = `${completed()}/${total()} níveis`;
    for (const [key, tab] of tabs) tab.replaceChildren(CONTINENT_LABEL[key], ...tabCount(key));
    tabs.get(continent)!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (area === 'maps') {
      levels.replaceChildren(
        ...mapLevels(continent).map((level) => levelCard(navigate, mapLevelCard(continent, level, mapMedals, mapRecords))),
        el('button', { className: 'see-all', type: 'button', onclick: () => navigate({ name: 'mapTable', continent }) }, [
          `Ver o mapa dos ${mapPool(continent, MAP_ALL).length} países ${CONTINENT_FROM[continent]} →`,
        ]),
      );
      return;
    }
    if (area === 'capitals') {
      levels.replaceChildren(
        ...DIFFICULTIES.map((difficulty) => levelCard(navigate, capitalLevelCard(continent, difficulty, capitalMedals, capitalRecords))),
        el('button', { className: 'see-all', type: 'button', onclick: () => navigate({ name: 'capitalTable', continent }) }, [
          `Ver as ${capitalPool(continent, 'general').length} capitais ${CONTINENT_FROM[continent]} →`,
        ]),
      );
      return;
    }
    levels.replaceChildren(
      ...DIFFICULTIES.map((difficulty) => levelCard(navigate, flagLevelCard(continent, difficulty, medals, records))),
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
    (['flags', 'maps', 'capitals'] as const).map((key) => [
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

interface Saved {
  medals: Medals<string>;
  records: QuizRecords<string>;
}

interface LevelCard {
  title: string;
  count: string;
  thumbs: Country[];
  medal: Medal | undefined;
  goal: number;
  record: QuizRecord;
  play: (mode: 'learn' | 'quiz') => Screen;
}

function flagLevelCard(continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): LevelCard {
  const pool = poolFor(countries, continent, difficulty);
  return {
    title: DIFFICULTY_LABEL[difficulty],
    count: `${pool.length} bandeiras`,
    thumbs: pool.slice(0, 3),
    medal: medalOf(medals, continent, difficulty),
    goal: goalFor(difficulty, pool.length),
    record: quizRecord(records, continent, difficulty),
    play: (mode) => ({ name: mode === 'learn' ? 'game' : 'quiz', continent, difficulty }),
  };
}

function capitalLevelCard(continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): LevelCard {
  const pool = capitalPool(continent, difficulty);
  return {
    title: DIFFICULTY_LABEL[difficulty],
    count: `${pool.length} países`,
    thumbs: [],
    medal: medalOf(medals, continent, difficulty),
    goal: goalFor(difficulty, pool.length),
    record: quizRecord(records, continent, difficulty),
    play: (mode) => ({ name: mode === 'learn' ? 'capitalGame' : 'capitalQuiz', continent, difficulty }),
  };
}

function mapLevelCard(continent: ContinentKey, level: MapLevel, medals: Medals<MapLevel>, records: QuizRecords<MapLevel>): LevelCard {
  const pool = mapPool(continent, level);
  return {
    title: mapLevelLabel(continent, level),
    count: `${pool.length} países`,
    thumbs: [],
    medal: medalOf(medals, continent, level),
    goal: goalFor(mapDifficulty(level), pool.length),
    record: quizRecord(records, continent, level),
    play: (mode) => ({ name: mode === 'learn' ? 'mapGame' : 'mapQuiz', continent, level }),
  };
}

function levelCard(navigate: Navigate, { title, count, thumbs, medal, goal, record, play }: LevelCard): HTMLElement {
  return el('section', { className: 'card level-card' }, [
    el('div', { className: 'level-head' }, [
      el('h2', {}, [title]),
      el('span', { className: 'meta' }, [count]),
      ...(thumbs.length ? [el('span', { className: 'thumbs' }, thumbs.map((country) => flagImg(country)))] : []),
    ]),
    el('div', { className: 'tags' }, [medalTag(medal, goal), quizTag(record)]),
    el('div', { className: 'level-actions' }, [
      el('button', { className: 'primary', type: 'button', onclick: () => navigate(play('learn')) }, ['Aprender']),
      el('button', { className: 'outline', type: 'button', onclick: () => navigate(play('quiz')) }, ['Quiz']),
    ]),
  ]);
}

function medalTag(medal: Medal | undefined, goal: number): HTMLSpanElement {
  return medal ? tag(MEDAL_LABEL[medal], true) : tag(`🏅 meta ${goal}`, false);
}

function quizTag(record: QuizRecord): HTMLSpanElement {
  if (isCompleted(record)) return tag(record.bestTimeMs === undefined ? '✓ Quiz' : `✓ Quiz ${formatTime(record.bestTimeMs)}`, true);
  return tag(record.bestScore === undefined ? 'Quiz —' : `Quiz ${record.bestScore} pts`, false);
}

function tag(text: string, earned: boolean): HTMLSpanElement {
  return el('span', { className: earned ? 'tag ok' : 'tag' }, [text]);
}
