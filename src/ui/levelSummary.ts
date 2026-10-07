import { countries } from '../data/countries';
import { goalFor, poolFor, type ContinentKey, type Difficulty } from '../engine/pool';
import { hasMedal, type Medals } from '../progress';
import { quizRecord, type QuizRecords } from '../quizRecords';
import { formatTime } from './time';

export interface LevelSummary {
  flags: string;
  learn: string;
  quiz: string;
}

export function levelSummary(continent: ContinentKey, difficulty: Difficulty, medals: Medals, records: QuizRecords): LevelSummary {
  const size = poolFor(countries, continent, difficulty).length;
  const medal = hasMedal(medals, continent, difficulty) ? ' · 🏅' : '';
  const { bestScore, bestTimeMs } = quizRecord(records, continent, difficulty);
  const quiz = [bestScore === undefined ? 'sem recorde' : `recorde ${bestScore} pts`];
  if (bestTimeMs !== undefined) quiz.push(formatTime(bestTimeMs));
  return {
    flags: `${size} bandeiras`,
    learn: `Aprender: ${goalFor(difficulty, size)} acertos${medal}`,
    quiz: `Quiz: ${quiz.join(' · ')}`,
  };
}
