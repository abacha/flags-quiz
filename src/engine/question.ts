import type { Country } from '../data/countries';
import type { Rng } from './rng';

export interface Crop {
  originX: number;
  originY: number;
}

export type Question =
  | { format: 'nameToFlags'; target: Country; options: Country[] }
  | { format: 'flagToNames'; target: Country; options: Country[] }
  | { format: 'flagToTwoNames'; target: Country; options: Country[] }
  | { format: 'crop'; target: Country; options: Country[]; crop: Crop }
  | { format: 'trueFalse'; target: Country; shown: Country }
  | { format: 'typeName'; target: Country }
  | { format: 'matchPairs'; target: Country; countries: Country[] }
  | { format: 'oddOneOut'; target: Country; intruder: Country; options: Country[] }
  | { format: 'sortSimilar'; target: Country; countries: Country[] }
  | { format: 'sortSimilarNames'; target: Country; countries: Country[] }
  | { format: 'typeSimilar'; target: Country; countries: Country[] }
  | { format: 'mapToNames'; target: Country; options: Country[] }
  | { format: 'nameToMap'; target: Country }
  | { format: 'mapPairs'; target: Country; countries: Country[] }
  | { format: 'mapTrueFalse'; target: Country; shown: Country }
  | { format: 'mapTypeName'; target: Country };

export type FormatId = Question['format'];

export interface FormatContext {
  pool: readonly Country[];
  world: readonly Country[];
  similarGroups: readonly (readonly string[])[];
  similarNames: readonly (readonly string[])[];
  similarDistractors: boolean;
}

export interface Format {
  id: FormatId;
  recall: boolean;
  choice: boolean;
  canTarget(target: Country, ctx: FormatContext): boolean;
  build(target: Country, ctx: FormatContext, rng: Rng): Question;
}
